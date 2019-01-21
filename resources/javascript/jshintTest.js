//data
   	function Song(title,id){
		if(!(this instanceof Song)){ throw new Error("song is a constructor and must be called with the new keyword.")}
		this.title = title;
		this.id = id;
	}

	//Feels kinda dirty making this global but this needs to be referenced in various different scopes
	var songList = [	new Song("Unravel - Tokyo Ghoul","QKXi08chD2E"),
						new Song("God Knows... - The Melancholy of Haruhi Suzumiya","WWB01IuMvzA"),
						new Song("Let Me Hear - Parasyte","yWlUCpXyh9w"),
						new Song("Silent Solitude - OxT","_4IlQEK1Vug"),
						new Song("Voracity - MYTH & ROID","D-LXfVLL5Tc"),
						new Song("Blue Exorcist OP 2","H5wtqQPEpt8"),
						new Song("Enigmatic Feeling - Ling Tosite Sigure","fmKPfgsclHg"),
						new Song("Abnormalize - Ling Tosite Sigure","J6Ja3Vip1tg"),
						new Song("We Will Rock You - Monster Strike","l8YXfBP3VFM"),
						new Song("Daze - Mekakucity Actors","jgv-IFmIn8c"),
						new Song("Pantomime - IA","JAXukKb0fgU"),
						new Song("Soul Eater OP 1","UAzpX8-P4WE"),
						new Song("Silly-Go-Round - FictionJunction","GzGWvvYOqK4"),
						new Song("Mob Psycho OP","l5rPZJiYFfg"),
						new Song("Fallen - EGOIST", "0lSLpbAxBTA"),
						new Song("Genesis - Stereo Dive Foundation", "hMKDN6B6fQA"),						
	];


	var ui = (function(){
		var _utils = (function(){
			function _create(tag,opts = {}){
				var _element = document.createElement(tag),
					_props = Object.keys(opts),
					_dataprops = _props.includes("dataset") ? Object.keys(opts.dataset) : null;

				_props.forEach(key=>{ _element[key] = opts[key]; });

				if(_dataprops != null){ 
					_dataprops.forEach((prop)=>{ _element.setAttribute(`data-${prop}`, opts.dataset[prop]); });
				}

				return _element;
			};

			return {
				create : _create,
			};
		})();

		//Only does nested props for dataset, 1 level down
		function createLIForSong(song){
			return _utils.create("li",{
				innerHTML : song.title || null,
				title : song.title || null,
				dataset : {
					id: song.id || null,
				},
			});
		};

		function init(){ loadSongs(songList); }
		
		function addSongToList(song){ _view.songList().appendChild(createLIForSong(song)); }
		function loadSongs(_songList){ _songList.forEach(song=> addSongToList(song)); }

		function togglePortVisibility(){ _view.player.port().classList.toggle("isNotVisible"); }
		function setStatus(state,message){ _view.status().innerText = `${state}: ${message}`; }

		var _view = {
			songList(){ return document.querySelector("#ulSongList"); },
			displayToggle(){ return document.querySelector("[data-prop='displayPort']"); },
			status(){ return document.querySelector("#status"); },
			player : {
				port(){ return document.querySelector("#port"); },
				prev(){ return document.querySelector("[data-prop='prev']"); },
				next(){ return document.querySelector("[data-prop='next']"); },
			},
		};

		return {
			init : init,
			view : _view,
			setStatus : setStatus,
			togglePortVisibility : togglePortVisibility,
			createSongLI : createLIForSong,
			addSong : addSongToList,
			loadSongs : loadSongs,
		};
	})();


	var youtubePlayer = (function(){
		var _youtubeAPI = null;
		var _player = null;

		function load(api){ _youtubeAPI = api; }
 		function init(elementID, videoId, onReady = function(){},onStateChange = function(){},height="450",width="800"){
 			if(_youtubeAPI == null){ throw new Error("Youtube API unavailable."); }
 			videoId = videoId || null;

 			_player = new _youtubeAPI.Player(elementID,{
 				height : height,
 				width : width,
 				videoId : videoId,
 				events: {
 					onReady : onReady,
 					onStateChange : onStateChange,
 				},
 			});
 		}
 		function isPlayerReady(){ return _youtubeAPI != null && _player != null; }

 		function playSong(id){ if(isPlayerReady()){ _player.loadVideoById({videoId : id}); } }
 		function loadSong(id){ if(isPlayerReady()){ _player.cueVideoById({videoId : id}); }}

		return {
			init: init,
			load : load,
			loadSong: loadSong,
			playSong: playSong,
			play : function(){ if(isPlayerReady()){ _player.playVideo(); } }
		};
	})();

	var viewModel = (function(){
		var _model = new Observable({
			idx : -1,
			songID : null,
			currentSong : null,
		});
		var autoplay = false;

		ui.view.player.prev().onclick = prevSong;
		ui.view.player.next().onclick = nextSong;
		ui.view.displayToggle().onclick = ui.togglePortVisibility;

		ui.view.songList().onclick = selectVideo;

		function nextSong(){
			_model.idx = (_model.idx == songList.length - 1) ? 0 : (_model.idx + 1);
		}
		function prevSong(){
			_model.idx = (_model.idx == 0) ? (songList.length - 1) : (_model.idx - 1);
		}

		function selectVideo(mouseEvent){
			function isTargetElement(element,tag){ return element instanceof HTMLElement && element.tagName == tag; }

			var clickedItem = mouseEvent.target;
			if(isTargetElement(clickedItem,"LI") && clickedItem.dataset.hasOwnProperty("id")){
				_model.songID = clickedItem.dataset.id;
			}
		}

		var playerEvents = (function(){
			var _playerState = {
					UNSTARTED : -1,
					ENDED : 0,
					PLAYING : 1,
					PAUSED : 2,
					BUFFERING : 3,
					CUED : 5,
			};

			function ready(){ if(autoplay){ } }
			function stateChanged(eventData){ 
				//Wish they would rename this to PLAYER_STATE or something because that's what it really is
				if(eventData.data == _playerState.PLAYING){ view.setStatus("Now Playing", _model.currentSong.title); }
				else if(eventData.data == _playerState.ENDED && autoplay){ nextSong(); }
			 }

			 return {
			 	ready : ready,
			 	stateChanged : stateChanged,
			 };
		})();

		_model.subscribe("change/idx", function(idx){ _model.songID = songList[idx.new].id; });
		_model.subscribe("change/songID",function(id){ 
			var songID = id.new;

			_model.currentSong = songList.find(song => song.id == songID); 
			_model.idx = songList.map(x=> x.id).indexOf(songID);
			youtubePlayer.loadSong(songID);
	    });
		_model.subscribe("change/currentSong", function(song){ 
			var currentSongLi = document.querySelector("#ulSongList li.activated"),
			    newSongLi = document.querySelector(`#ulSongList li[data-id="${_model.songID}"]`);

			if(currentSongLi != null){ currentSongLi.classList.toggle("activated");}
			newSongLi.classList.toggle("activated");
		});

		return {
			playerEvents : playerEvents,
		};
	})();

	function onYouTubeIframeAPIReady(){ 
		youtubePlayer.load(YT);
	    configureYoutubeOptions();
    } 
	function configureYoutubeOptions(){
		youtubePlayer.init('port',null,viewModel.playerEvents.onReady,viewModel.playerEvents.onStateChange);
	}

	ui.init();

	var rainbow_ref = null;
	var rainbow_stahp = function(){
		clearInterval(rainbow_ref);
		rainbow_ref = null;
	}
	var rainbow_dash = function(){
		if(rainbow_ref){return;}
		rainbow_ref = (function(){
			var counter = 0;
			var colors = ["red","orange","yellow","green","blue","purple"];
			var _ref = setInterval(function(){
				counter++;
				if(counter%6==0){counter = 0;}
				ui.view.songList().style.background = colors[counter%6];
			},400);
			return _ref;
		})();
	}