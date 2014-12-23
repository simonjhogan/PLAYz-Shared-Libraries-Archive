
function Shared() {
	this.PLEX_SESSION_ID = "plexSessionID";
	this.PLEX_CURRENT_SECTION = "plexCurrentSection";
	this.PLEX_SERVER_LIST = "plexServerList";	
	this.PLEX_CURRENT_PREFIX = "plexSharedSelected-";
	this.PLEX_OPTIONS_PREFIX = "plexOptions-";
	
	this.plex = new PLEX();	
	this.cache = "";
	this.toggleActive = false;
	this.titleScroll;
	this.scanErrorCount = 0;
	var self = this;
	
	$("#navigatorSwitch").click(function() {
		location.href = "index.html";
	});
	
	$("#previewClose").click(function() {
		$("#recentlyAdded .content").scrollLeft(0);
		$("#preview").fadeOut();
		$("#navigator #sections a.selected").focus();
	});	
};

Shared.prototype.initialise = function(focus)	{
	var self = this;

	var sharedServers = self.plex.getSharedServers();
	
	var i = 0;
	$.each(sharedServers, function( index, value ) {
		if (this.owned == 0) {
			var sharedUrl = this.scheme + "://" + this.address + ":" + this.port;
			var sharedToken = this.accessToken;
			
			self.plex.checkSharedLibraryServerExists(sharedUrl, sharedToken, function(xml) {
				var sharedFriendlyName = $(xml).find("MediaContainer:first").attr("friendlyName");
				
				self.plex.getSharedSections(sharedUrl, sharedToken, function(xml) {
					$(xml).find("Directory").each(function(index, item) {
						html = "<li><a data-key-index=\"" + i + "\" data-server-name=\"" + sharedFriendlyName + "\" data-server-url=\"" + sharedUrl + "\" data-server-token=\"" + sharedToken + "\" data-title=\"" + $(this).attr("title") + "\" data-key=\"" + $(this).attr("key") + "\" data-section-type=\"" + 
								$(this).attr("type") + "\" data-art=\"" + self.plex.getSharedTranscodedPath(sharedUrl, sharedToken, $(this).attr("art"), 1280, 720) + "\" href>" +  $(this).attr("title")  + "</a></li>";	
						i = i + 1;		
						$("#sections ul").append(html);
					});
					
					// Add Event Handlers
					$("#navigator #sections li a, #settings li a").off();
					
					$("#navigator #sections li a, #settings li a").focus(function(event) {
						var link = this;
						
						if (!$(this).hasClass("selected")) { 
							$(this).parents("#sections, #settings").find("li a").removeClass("selected");
							
							$(".dialog").hide();
							$("#recentlyAdded").removeClass("show-quick-menu");
							$("#recentlyAdded").hide();
			
							$(this).addClass("selected");
							
							var t = setTimeout(function() {	
								if ($(link).hasClass("selected")) {
									$.event.trigger({
										type: "navigationFocus",
										serverName: $(link).data("serverName"),
										serverUrl: $(link).data("serverUrl"),
										serverToken: $(link).data("serverToken"),
										title: $(link).data("title"),					
										key: $(link).data("key"),
										sectionType: self.plex.getMediaType($(link).data("title"), $(link).data("sectionType")),
										art: $(link).data("art")				
									});
								}
							},500);
						}
					});
					
					$("#navigator #sections li a, #settings li a").hover(function(event) {
						$(this).focus();
					});
					
					//Navigation click event handler
					$("#navigator #sections li a, #navigator #settings li a").click(function(event) {
						$.event.trigger({
							type: "navigationClick",
							serverName: $(this).data("serverName"),
							serverUrl: $(this).data("serverUrl"),
							serverToken: $(this).data("serverToken"),
							title: $(this).data("title"),					
							key: $(this).data("key"),
							sectionType: self.plex.getMediaType($(this).data("title"), $(this).data("sectionType")),
							art: $(this).data("art")					
						});	
						event.preventDefault();
					});
					
					// Handle Arrow Key Navigation
					$("#sections a, #settings a").keydown(function(event) {
						var index = $(this).data("key-index");
						var previous = $(this).parents("#sections, #settings").find("li a[data-key-index='" + (Number(index)-1) + "']");
						var next = $(this).parents("#sections, #settings").find("li a[data-key-index='" + (Number(index)+1) + "']");
						
						// Up Arrow		
						if (event.which == 38) {
							event.preventDefault();
							previous.focus();
						}
						
						// Down Arrow
						if (event.which == 40) {
							event.preventDefault();
							next.focus();
						}
						
						// Left Arrow
						if (event.which == 37) {
							event.preventDefault();
							location.href = "index.html";
						}
						
						// Right Arrow - Quick Select
						if (event.which == 39) {
							event.preventDefault();
							$.event.trigger({
								type: "navigationQuickSelect",
								serverName: $(link).data("serverName"),
								serverUrl: $(link).data("serverUrl"),
								serverToken: $(link).data("serverToken"),
								title: $(this).data("title"),					
								key: $(this).data("key"),
								sectionType: self.plex.getMediaType($(this).data("title"), $(this).data("sectionType")),
								art: $(this).data("art")					
							});		
						}		
					});
					
					self.setClock();
					self.hideLoader();
					
					if (focus) {
						$(focus).focus();
					} else {
						if (localStorage.getItem(self.PLEX_CURRENT_SECTION) && $("#sections li a[data-key='" + localStorage.getItem(self.PLEX_CURRENT_SECTION) + "']:first").length > 0) {
							$("#sections li a[data-key='" + localStorage.getItem(self.PLEX_CURRENT_SECTION) + "']:first").focus();
						} else {
							$("#sections li a:first").focus();
						}
					}
				});
				
				$(document).on("navigationQuickSelect", function(event) {					
					switch(event.sectionType) {
						case "settings":
							$("#scan").focus();
							break;
		
						case "search":
							$("#query").focus();
							break;

						case "options":
							$("#optionTimeDisplay").focus();
							break;						
							
						default:
							localStorage.setItem(self.PLEX_CURRENT_SECTION, event.key);
							if ($("#recentlyAdded").hasClass("show-quick-menu")) {
								$("#recentlyAdded a:first").focus();
							}
							break;
						}
				});
				
				$(document).on("navigationClick", function(event) {			
					switch(event.sectionType) {
						case "quit":
							self.close();
							break;
		
						case "home":		
						case "movie":
						case "photo":	
						case "show":			
						case "artist":
							self.showLoader("Loading");
							location.href = "mediashared.html?action=view&section=" + event.sectionType + "&key=" + event.key + "&servername=" + event.serverName + "&serverurl=" + event.serverUrl + "&servertoken=" + event.serverToken;
							break;
					
					}
				});
				
				$(document).on("navigationFocus", function(event) {			
					if (event.art) {
						$("#applicationWallpaper").css("background-image", "url(" + event.art + ")");
					}
					
					if (event.serverName) {
						$("#serverName").text(event.serverName);
					}
					
					switch(event.sectionType) {
						case "home":		
						case "movie":
						case "photo":	
						case "show":			
						case "artist":
						case "ondeck":	
							localStorage.setItem(self.PLEX_CURRENT_SECTION, event.key);	
							self.quickSelectionMenu(event);
							break;							
					}	
				});
			},
			function() {
				alert("Dead:" + sharedUrl);
			});
		}
	});
};

Shared.prototype.setClock = function()
{
	var self = this;
	
	try {
		var device = document.getElementById("device");
		
		if (device.getLocalTime) {
			var now = device.getLocalTime();
			var hours = now.hour;
			var minutes = now.minute;
			var seconds = now.second;
			var ampm = hours >= 12 ? 'PM' : 'AM';
			minutes = minutes < 10 ? '0'+minutes : minutes;
			seconds = seconds < 10 ? '0'+seconds : seconds;
			
			if (localStorage.getItem(this.PLEX_OPTIONS_PREFIX + "time24") == "1") {
				$("#clock").text(hours + ':' + minutes + ":" + seconds);
			} else {
				hours = hours % 12;
				hours = hours ? hours : 12; // hour '0' should be '12'
				$("#clock").text(hours + ':' + minutes + ":" + seconds + ' ' + ampm);
			}
		} else {
			var now = new Date();
			$("#clock").text(now.toLocaleTimeString());
		}
	
		if (self.debug) {
			if (window.NetCastGetUsedMemorySize) {
				$("#debugMemory").text(window.NetCastGetUsedMemorySize());		
			}
		}	
	} catch(err) {
		var now = new Date();
		$("#clock").text(now.toLocaleTimeString());	
	}
	clock = setTimeout(function(){self.setClock();}, 500);
};

Shared.prototype.hideLoader = function()
{
	$("#loader").hide();
};

Shared.prototype.close = function()
{
	if (window.NetCastExit) {
		window.NetCastExit();
	} else {
		window.close();
	}
};

Shared.prototype.showLoader = function(message)
{
	$("#message").text(message);
	$("#loader").show();
};

Shared.prototype.quickSelectionMenu = function(event)
{
	var self = this;
	var maxItems = 30;
	
	self.showLoader("Loading");
			
	self.plex.getSharedMediaItems(event.serverUrl, event.serverToken, event.sectionType, event.key, function(xml) {
		var sectionType = event.sectionType;
		var sectionKey = event.key;
		var serverUrl = event.serverUrl;
		var serverToken = event.serverToken;
		this.cache = xml;
		var current = this;
		
		$("#recentlyAdded .content ul").empty();
		$(xml).find("Directory,Video,Photo").each(function(index, item) {
			if (index < maxItems) {
				html = self.plex.getSharedThumbHtml(event.serverUrl, event.serverToken, index, $(this).attr("title"), sectionType + " recent", $(this).attr("type"), $(this).attr("key"), 
					{"thumb": $(this).attr("thumb"),
					"parentThumb": $(this).attr("parentThumb"), 
					"grandparentThumb": $(this).attr("grandparentThumb"),
					"art": $(this).attr("art"),
					"artist": $(this).attr("parentTitle"), 
					"series": $(this).attr("grandparentTitle"), 
					"season": $(this).attr("parentIndex"), 
					"episode": $(this).attr("index"),
					"parentKey": $(this).attr("parentKey"),
					"lastViewedAt": $(this).attr("lastViewedAt"),
					"viewOffset": $(this).attr("viewOffset"),
					"duration": $(this).attr("duration"),
					"viewCount": $(this).attr("viewCount"),
					"media": $(this).find("Media Part:first").attr("key"),
					"sectionKey": $(this).attr("librarySectionID") ? $(this).attr("librarySectionID") : sectionKey
					});		
				$("#recentlyAdded .content ul").append(html);
			}
		});
		
		$("#recentlyAdded").attr("data-current-key", event.key);
		$("#recentlyAdded").show();
		$("#recentlyAdded").addClass("show-quick-menu");
		
		$("#recentlyAdded a").hover(function() {
			$(this).focus();
		});

		$("#recentlyAdded a").click(function(event) {
			event.preventDefault();
			self.showLoader("Loading");
			url = "./itemshared.html?action=preview&section=" + sectionType + "&sectionKey=" + sectionKey + "&key=" + encodeURIComponent($(this).data("key")) + "&serverurl=" + serverUrl + "&servertoken=" + serverToken;
			$(this).attr("href", url);
			location.href = url;
		});

		$("#recentlyAdded a").focus(function(event) {
			var current = this;
			var item = $(this);
			var left = 0;
			
			localStorage.setItem(self.PLEX_CURRENT_PREFIX + $(this).data("sectionType"), $(this).data("key"));

			switch($(this).data("mediaType")) {
				case "album":
					self.plex.getSharedMediaMetadata($(this).data("serverUrl"), $(this).data("serverToken"), $(this).data("key"), function(xml) { 
						var metadata = $(xml).find("MediaContainer:first");
						
						var tracks = [];
						$(metadata).find("Track").each(function() { tracks.push($(this).attr("index") + ". " + $(this).attr("title")) });
						
						if ($("#recentlyAdded a:focus").data("key") == $(current).data("key")) {
							$("#previewContent").html(self.plex.getSharedMediaHtml(item.data("serverUrl"), item.data("serverToken"), metadata.attr("title2"), "album", 
								{"art": metadata.attr("art"),
								"thumb": metadata.attr("thumb"),
								"artist": metadata.attr("title1"),
								"year": metadata.attr("parentYear"),
								"tracks": tracks															
							}));
							$("#preview").fadeIn();
						}
					});
					break;

				case "episode":
					self.plex.getSharedMediaMetadata($(this).data("serverUrl"), $(this).data("serverToken"), $(this).data("key"), function(xml) { 
						var metadata = $(xml).find("Video:first");
																		
						if ($("#recentlyAdded a:focus").data("key") == $(current).data("key")) {
							$("#previewContent").html(self.plex.getSharedMediaHtml(item.data("serverUrl"), item.data("serverToken"), metadata.attr("title"), metadata.attr("type"), 
								{"art": metadata.attr("art"),
								"thumb": metadata.attr("thumb"),
								"lastViewedAt": metadata.attr("lastViewedAt"),
								"viewOffset": metadata.attr("viewOffset"),
								"viewCount": metadata.attr("viewCount"),
								"duration": metadata.attr("duration"),
								"parentThumb": metadata.attr("parentThumb"),
								"summary": metadata.attr("summary"),
								"grandparentTitle": metadata.attr("grandparentTitle"),
								"index": metadata.attr("index"),
								"parentIndex": metadata.attr("parentIndex"),
								"contentRating": metadata.attr("contentRating"),
								"rating": metadata.attr("rating"),
								"year": metadata.attr("year")																
							}));
							$("#preview").fadeIn();
						}
					});
					break;

				case "movie":
					self.plex.getSharedMediaMetadata($(this).data("serverUrl"), $(this).data("serverToken"), $(this).data("key"), function(xml) { 
						var metadata = $(xml).find("Video:first");

						var roles = [];
						$(metadata).find("Role").each(function() { roles.push($(this).attr("tag")) });

						var genre = [];
						$(metadata).find("Genre").each(function() { genre.push($(this).attr("tag")) });

						
						if ($("#recentlyAdded a:focus").data("key") == $(current).data("key")) {
							$("#previewContent").html(self.plex.getSharedMediaHtml(item.data("serverUrl"), item.data("serverToken"), metadata.attr("title"), metadata.attr("type"), 
								{"art": metadata.attr("art"),
								"thumb": metadata.attr("thumb"),
								"lastViewedAt": metadata.attr("lastViewedAt"),
								"viewOffset": metadata.attr("viewOffset"),
								"viewCount": metadata.attr("viewCount"),
								"tagline": metadata.attr("tagline"),
								"summary": metadata.attr("summary"),
								"studio": metadata.attr("studio"),
								"year": metadata.attr("year"),
								"rating": metadata.attr("rating"),
								"contentRating": metadata.attr("contentRating"),
								"director": $(metadata).find("Director:first").attr("tag"),
								"roles": roles,
								"genre": genre,
								"duration": metadata.attr("duration")															
							}));
							$("#preview").fadeIn();
						}
					});
					break;
					
				case "photo":
					self.plex.getSharedMediaMetadata($(this).data("serverUrl"), $(this).data("serverToken"), $(this).data("key"), function(xml) { 
						var metadata = $(xml).find("Photo:first");
						
						if ($("#recentlyAdded a:focus").data("key") == $(current).data("key")) {						
							$("#previewContent").html(self.plex.getSharedMediaHtml(item.data("serverUrl"), item.data("serverToken"), metadata.attr("title"), metadata.attr("type"), 
								{"art": metadata.attr("art"),
								"thumb": metadata.attr("thumb"),
								"summary": metadata.attr("summary"),
								"year": metadata.attr("year"),
								"width": metadata.find("Media:first").attr("width"),
								"height": metadata.find("Media:first").attr("height"),
								"container": metadata.find("Media:first").attr("container")																																						
							}));
							$("#preview").fadeIn();
						}
					});
					break
				
				default:
					self.plex.getSharedMediaMetadata($(this).data("serverUrl"), $(this).data("serverToken"), $(this).data("key"), function(xml) { 
						var metadata = $(xml).find("Directory:first,Video:first,Photo:first,Track:first");
						
						if ($("#recentlyAdded a:focus").data("key") == $(current).data("key")) {
							$("#previewContent").html(self.plex.getSharedMediaHtml(item.data("serverUrl"), item.data("serverToken"), metadata.attr("title"), metadata.attr("type"), 
								{"art": metadata.attr("art"),
								"thumb": metadata.attr("thumb"),
								"summary": metadata.attr("summary"),
								"year": metadata.attr("year")														
							}));
							$("#preview").fadeIn();
						}
					});
					break
			}
		});

		//Handle Quick Select Menu Keys						
		$("#recentlyAdded a").keydown(function(event) {
			var index = $(this).data("key-index");
			var previous = $(this).parents(".content").find("ul li a[data-key-index='" + (Number(index)-1) + "']");
			var next = $(this).parents(".content").find("ul li a[data-key-index='" + (Number(index)+1) + "']");
	
			// Left Arrow
			if (event.which == 37) {
				event.preventDefault();
				if (index == 0) {
					$("#recentlyAdded .content").scrollLeft(0);
					$("#preview").fadeOut();
					$("#navigator #sections a.selected").focus();
				} else if (index == 1) {
					$("#recentlyAdded .content").scrollLeft(0);
					previous.focus();
				} else {
					previous.focus();
				}
			}
			
			// Right Arrow - Quick Select
			if (event.which == 39) {
				event.preventDefault();
				next.focus();
			}
			
			// Play Button
			if (event.which == 415 || event.which == 80) {
				event.preventDefault();
				if ($(this).data("media") && $(this).data("media") != "undefined") {
					self.showLoader("Loading");
					location.href = "player.html?key=" + $(this).data("key") + "&autoplay=true";
				}
			}
			
			if (event.which == 461 || event.which == 27) {
				event.preventDefault();
				$("#recentlyAdded .content").scrollLeft(0);
				$("#preview").fadeOut();
				$("#navigator #sections a.selected").focus();
			}			
		});	
		
		$(".thumb").lazyload({
			threshold : 400,
			placeholder: 'system/images/poster.png',
			container: $("#recentlyAdded .content")
		});
		
		self.hideLoader();
	});
};