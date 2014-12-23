function MediaMetadataShared()
{
	this.PLEX_OPTIONS_PREFIX = "plexOptions-";	
	this.PLEX_CURRENT_PREFIX = "plexSelected-";
};

MediaMetadataShared.prototype.initialise = function()
{
	var self = this;
	this.plex = new PLEX();
	this.cache;
	this.section = $.querystring().section;
	this.sectionKey = $.querystring().sectionKey;
	this.key = decodeURIComponent($.querystring().key);
	this.serverName = $.querystring().servername;
	this.serverUrl = $.querystring().serverurl;
	this.serverToken = $.querystring().servertoken;

	$("#menu a").tooltipster({position: "right"});

	//Enable page loading icon
	if (window.NetCastSetPageLoadingIcon) {
	    window.NetCastSetPageLoadingIcon('enabled');
	}

	if (localStorage.getItem(this.PLEX_OPTIONS_PREFIX + "largeText") == "1") {
		$("body").addClass("xlarge");
	}
	
	this.debug = localStorage.getItem(this.PLEX_OPTIONS_PREFIX + "debug") == "1" ? true : false;
	if (this.debug) {
		var device = document.getElementById("device");
		
		html = "<table>";
		html += "<tr><th>Platform</th><td>" + device.platform + "</td></tr>";
		html += "<tr><th>Chipset</th><td>" + device.chipset + "</td></tr>";
		html += "<tr><th>HW Version</th><td>" + device.hwVersion + "</td></tr>";
		html += "<tr><th>SW Version</th><td>" + device.hwVersion + "</td></tr>";		
		html += "<tr><th>SDK Version</th><td>" + device.SDKVersion + "</td></tr>";
		html += "<tr><th>IP</td><th>" + device.net_ipAddress + "</td></tr>";		
		
		if (window.NetCastGetUsedMemorySize) {
			html += "<tr><th>Used Memory</th><td id=\"debugMemory\">" + window.NetCastGetUsedMemorySize() + "</td></tr>";		
		}
		html += "</table>";
		$("#debug").html(html);				
		$("#debug").show();
		this.setDebug();
	}
	
	if (this.key.indexOf("unwatched") > -1) {
		this.plex.unwatched = true;
	}
		
	if (this.key.indexOf("/children") > -1) {
		this.key = this.key.substr(0, this.key.indexOf("/children"));
		this.plex.hasChildren = true;
	}

	if (this.key.indexOf("/allLeaves") > -1) {
		this.key = this.key.substr(0, this.key.indexOf("/allLeaves"));
		this.plex.hasLeaves = true;
	}

	$(document).keydown(function(event) {
		if (event.which == 461 || event.which == 27) {
			event.preventDefault();
			history.back(1);
		}	
	});
	
	$("#menu a").mouseenter(function() {
		$(this).focus();
	});

	$("#menu a").keydown(function(event) {
		
		// Up Arrow		
		if (event.which == 38) {
			if ($(this).data("keyUp")) {
				$($(this).data("keyUp")).focus();
				event.preventDefault();
			}
		}
		
		// Down Arrow
		if (event.which == 40) {
			if ($(this).data("keyDown")) {
				$($(this).data("keyDown")).focus();
				event.preventDefault();
			}	
		}
		
		// Left Arrow
		if (event.which == 37) {
			if (self.menuFlag) {
				$("#menuFilterContent a:first").focus();
			}
			event.preventDefault();
		}
		
		// Right Arrow
		if (event.which == 39) {
			if ($(this).data("keyRight")) {
				$($(this).data("keyRight")).focus();
				if (self.menuFlag) {
					self.hideMenu();
				}
				event.preventDefault();
			}
		}		
	});	
	
	this.showLoader("Loading");
	
	this.plex.getSharedMediaMetadata(this.serverUrl, this.serverToken, this.key, function(xml) {
		self.cache = xml;
		var mediaItem = $(xml).find("MediaContainer:first").children().first();
		self.mediaKey = mediaItem.attr("ratingKey");
		var mediaType = self.plex.hasLeaves ? "all" : mediaItem.attr("type");
		
		$("#applicationWallpaper").css("background-image", "url(" + self.plex.getSharedTranscodedPath(self.serverUrl, self.serverToken, mediaItem.attr("art"), 1280, 720) + ")");
		$("#mediaPreviewContent").html(self.plex.getSharedMediaPreviewHtml(self.serverUrl, self.serverToken, xml));

		if ($("#watchStatus").hasClass("unwatched-icon")) {
			$("#watched i").removeClass("ok").addClass("remove");
		}
		
		if ($(".summary").length > 0) {			
			if ($(".summary")[0].scrollHeight >  $(".summary").height() + 12) {
				var top = 0;
				clearInterval(self.titleScroll);
				self.summaryScroll = setInterval(function() {
					clearInterval(self.summaryScroll);
					self.summaryScroll = setInterval(function() {
						if (top <= $(".summary")[0].scrollHeight -  $(".summary").height() + 20) {
							$(".summary").scrollTop(top+=1);
						} else {
							top = -2;
							//clearInterval(self.summaryScroll);	
						}
					}, 100);
				},2000);
			}
		}
		
		if (localStorage.getItem(self.PLEX_OPTIONS_PREFIX + "themeMusic") != "1") {
			if ($("#theme").data("src")) {
				$player = $("#audioPlayer");
				//ATENCAO ESTE URL
				$player.attr("src", $("#theme").data("src"));
				$player[0].load();
				$player[0].play();			
			}
		}
		
		var query = "";
		if (self.plex.unwatched) {
			query = "?unwatched=1";
		}
		
		switch(mediaType) {
			case "artist":
				self.getMediaChildren("album", self.key + "/children");
				break;
				
			case "show":
				self.getMediaChildren("show", self.key + "/children" + query);
				break;

			case "season":
				self.getMediaChildren("episode", self.key + "/children" + query);
				break;
				
			case "album":
				self.getMediaChildren("track", self.key + "/children");
				break;

			case "all":
				self.getMediaChildren("group", self.key + "/allLeaves" + query);
				break;				
		}

		if (mediaItem.find("Part:first").attr("key") && (mediaItem.attr("type") == "movie" || mediaItem.attr("type") == "episode") ) {
			$("#audio").show();
			$("#audio").click(function(event){
				event.preventDefault();
				self.audioDialog();
			});

			$("#subtitles").show();
			$("#subtitles").click(function(event){
				event.preventDefault();
				self.subtitleDialog();
			});
			
			$("#watched").show();
			$("#watched").click(function(event){
				event.preventDefault();
				self.toggleWatchedStatus();
			});			
			
			$("#play").attr("href",  "playershared.html?key=" + mediaItem.attr("key") + "&autoplay=true" + "&serverurl=" + self.serverUrl + "&servertoken=" + self.serverToken);
			$("#play").show();
			$("#play").focus();
		}	else {
			$("#back").focus();
		}
		
		self.hideLoader();
	});

};

MediaMetadataShared.prototype.getMediaChildren = function(mediaType, key) {
	this.rowCount = 0;
	var self = this;
	
	this.plex.getSharedMediaMetadata(self.serverUrl, self.serverToken, key, function(xml) {
		mediaType = mediaType == "group" ? $(xml).find("MediaContainer:first").attr("viewGroup") : mediaType; 
	
		$(xml).find("Directory,Video,Photo,Artist,Track").each(function(index, item) {

			html = self.plex.getSharedThumbHtml(self.serverUrl, self.serverToken, index, $(this).attr("title"), self.section, mediaType, $(this).attr("key"), 
				{"thumb": $(this).attr("thumb"),
				"parentThumb": $(this).attr("parentThumb"), 
				"grandparentThumb": $(this).attr("grandparentThumb"),
				"art": $(this).attr("art"),
				"index": $(this).attr("index"), 
				"artist": $(this).attr("parentTitle"), 
				"series": $(this).attr("grandparentTitle"), 
				"season": $(this).attr("parentIndex"), 
				"episode": $(this).attr("index"),
				"parentKey": $(this).attr("parentKey"),
				"lastViewedAt": $(this).attr("lastViewedAt"),
				"viewOffset": $(this).attr("viewOffset"),	
				"viewCount": $(this).attr("viewCount"),	
				"leafCount": $(this).attr("leafCount"),	
				"viewedLeafCount": $(this).attr("viewedLeafCount"),					
				"duration": $(this).attr("duration"),
				"media": $(this).find("Media Part:first").attr("key"),
				"filter": self.filter,
				"sectionKey": key,
				"containerArt": $(xml).find("MediaContainer:first").attr("art"),
				"containerThumb": $(xml).find("MediaContainer:first").attr("thumb")
				});		
			$("#children ul").append(html);

		});
		
		self.rowCount = self.getRowCount("#children ul li");	
		
		//Display side button and set remote functions for albums
		if ($("#children ul li a").data("mediaType") == "track") {
			$("#play").click(function(event) {
				event.preventDefault();
				self.playTracks();
			});
			$("#play").show();
			
			$(document).keydown(function(event) {
				var player = document.getElementById("audioPlayer");
				
				switch (event.which) {
					case 83:
					case 413: //STOP
						self.currentTrack = 0;
						self.paused = false;
						player.pause();
						break;
					
					case 80:
					case 415: //PLAY
						if (self.paused) {
							player.play();
							self.paused = false;
						} else {
							self.playTracks();
						}
						break;
						
					case 70:	
					case 417: //FORWARD
						self.playNextTrack();
						break;
					
					case 82:
					case 412: //REWIND
						self.playPreviousTrack();
						break;	
						
					case 19: //PAUSE
						self.paused = true;
						player.pause();
						break;							
				}	
			});			
			
		}

		$("#children li a").mouseenter(function(event) {
			$(this).focus();
		});

		$("#title").fadeOut(5000);

		$("#children li a").focus(function(event) {
			var item = $(this);
			var left = 0;
			
			if ($(self).find(".subtitle").length > 0) {
				clearInterval(self.titleScroll);
				self.titleScroll = setInterval(function() {
					item.find(".subtitle").css("textOverflow", "clip");
					clearInterval(self.titleScroll);
					self.titleScroll = setInterval(function() {
						if (left <= item.find(".subtitle")[0].scrollWidth) {
							item.find(".subtitle").scrollLeft(left+=2);
						} else {
							clearInterval(self.titleScroll);	
						}
					}, 100);
				},1000);
			}
		});

		$("#children li a").blur(function(event) {
			clearInterval(self.titleScroll);	
			$(this).find(".subtitle").scrollLeft(0);
			$(this).find(".subtitle").css("textOverflow", "ellipsis");
		});
		
		$("#children li a").click(function(event) {
			event.preventDefault();
			switch ($(this).data("mediaType")) {
				case "track":
					self.playTracks($(this).data("keyIndex"));
					break;
					
				default:
					self.showLoader("Loading");
					$(this).attr("href", "itemshared.html?action=preview&section=" + self.section + "&sectionKey=" + self.sectionKey + "&key=" + encodeURIComponent($(this).data("key")) + "&servername=" + self.serverName + "&serverurl=" + self.serverUrl + "&servertoken=" + self.serverToken);
					location.href = $(this).attr("href");
					break;
			}
		});

		// Handle Arrow Key Navigation
		$("#children a").keydown(function(event) {
			var index = $(this).data("key-index");
			
			var left = (Number(index)%self.rowCount == 0) ? $("#back") : $(this).parents("#children").find("li a[data-key-index='" + (Number(index)-1) + "']");
			var right = $(this).parents("#children").find("li a[data-key-index='" + (Number(index)+1) + "']");
			var up = $(this).parents("#children").find("li a[data-key-index='" + (Number(index)-self.rowCount) + "']");
			var down = $(this).parents("#children").find("li a[data-key-index='" + (Number(index)+self.rowCount) + "']");
			
			// Up Arrow		
			if (event.which == 38) {
				event.preventDefault();
				up.focus();
			}
			
			// Down Arrow
			if (event.which == 40) {
				event.preventDefault();
				down.focus();
			}
			
			// Left Arrow
			if (event.which == 37) {
				event.preventDefault();
				left.focus();
			}
			
			// Right Arrow
			if (event.which == 39) {
				event.preventDefault();
				right.focus();
			}
			
			// Play Button
			if (event.which == 415) {
				event.preventDefault();
				switch ($(this).data("mediaType")) {
					case "track":
						self.playTrack(self.serverUrl, self.server.Token, $(this).data("keyIndex"));
						break;
						
					case "episode":
					case "movie":
						self.showLoader("Loading");
						location.href = "playershared.html?key=" + $(this).data("key") + "&autoplay=true" + "&serverurl=" + self.serverUrl + "&servertoken=" + self.serverToken;
						break;
				}				
			}	
	
		});

		$("#children a:first").focus();
		
		$("#children .thumb").lazyload({
			placeholder: 'system/images/poster.png',
			container: $("#children")
		});
		
	});	
};

MediaMetadataShared.prototype.playTrack = function(ServerUrl, ServerToken, keyIndex)
{
	var $player = $("#audioPlayer");
	var $track = $("#children a[data-key-index='" + keyIndex + "']");
	
	$player.show();
	$("#children a").removeClass("playing");
	$track.addClass("playing");
	
	//$player.show();
	$player.attr("src", ServerUrl + $track.data("media") + "&X-Plex-Token=" + ServerToken);
	$player[0].load();
	$player[0].play();	
};

MediaMetadataShared.prototype.playTracks = function(startIndex)
{
	var self = this;
	var $player = $("#audioPlayer");
	
	startIndex = startIndex || 0;
		
	this.playTrack(self.serverUrl, self.server.Token, startIndex);	
	this.currentTrack = startIndex;

	$player.on('ended', function(event) {
		self.playNextTrack();
	});
};

MediaMetadataShared.prototype.playNextTrack = function()
{
	this.currentTrack++;
	if (this.currentTrack < $("#children a").length) {
		this.playTrack(this.serverUrl, this.server.Token, this.currentTrack);
	} else {
		this.currentTrack = 0;
		this.playTrack(this.serverUrl, this.server.Token, this.currentTrack);
	}
};

MediaMetadataShared.prototype.playPreviousTrack = function()
{
	this.currentTrack--;
	if (this.currentTrack >= 0) {
		this.playTrack(this.serverUrl, this.server.Token, this.currentTrack);
	} else {
		this.currentTrack = $("#children a").length-1;
		this.playTrack(this.serverUrl, this.server.Token, this.currentTrack);
	}
};

MediaMetadataShared.prototype.showLoader = function(message)
{
	$("#message").text(message);
	$("#loader").show();
};

MediaMetadataShared.prototype.hideLoader = function()
{
	$("#loader").hide();
};

MediaMetadataShared.prototype.getRowCount = function(query) {
    var row = 0;
    $(query).each(function() {
        if($(this).prev().length > 0) {
            if($(this).position().top != $(this).prev().position().top) return false;
            row++;
        } else {
            row++;   
        }
    });
    return row;
};

MediaMetadataShared.prototype.setDebug = function()
{
	var self = this;
	var device = document.getElementById("device");

	if (self.debug) {
		if (window.NetCastGetUsedMemorySize) {
			$("#debugMemory").text(window.NetCastGetUsedMemorySize());		
		}
	}	
	
	timer = setTimeout(function(){self.setDebug();}, 500);
};

MediaMetadataShared.prototype.toggleWatchedStatus = function()
{
	if ($("#watchStatus").hasClass("unwatched-icon")) {
		this.plex.setWatched(this.mediaKey, function() {
			$("#watchStatus").removeClass();
			$("#watched i").removeClass("remove").addClass("ok");
		});
	} else {
		this.plex.setUnwatched(this.mediaKey, function() {
			$("#watchStatus").removeClass().addClass("unwatched-icon unwatched-full-icon");
			$("#watched i").removeClass("ok").addClass("remove");	
		});
	}	
};
