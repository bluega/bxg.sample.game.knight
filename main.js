////////////////////////////////////////////////////////////////////////////////
// Sample - Horizontal scroll game with 3 controls
/*
	Objectives:
		Loading level data
		Using Tilemap modules
*/
"Copyright ⓒ 2009-2012 BLUEGA Inc.";
"This sample game source is licensed under the MIT license."

////////////////////////////////////////////////////////////////////////////////
// Control manager for scrolling

IScrollManager = {
	onInputEvent: function(/*CControl*/control, /*Object*/evtMap)
	{
		if (!bxg.player.active) return;
		if (bxg.player.data.state >= 1000) return;	// If player is alive.
		
		// Move
		if (evtMap.keyLeft && evtMap.keyLeft.fired){
			bxg.player.data.dx = -bxg.player.data.speed;
			bxg.player.data.dxPolling = (evtMap.keyLeft.type == 'polling');
			
			bxg.player.setCurSpriteState('runL'+bxg.player.data.metaTargetHP);
		}
		else if (evtMap.keyRight && evtMap.keyRight.fired){
			bxg.player.data.dx = bxg.player.data.speed;
			bxg.player.data.dxPolling = (evtMap.keyLeft.type == 'polling');
			
			bxg.player.setCurSpriteState('runR'+bxg.player.data.metaTargetHP);
		}
		
		// Keyboard IME mode error
		if (evtMap.errorIME && evtMap.errorIME.fired){
			alert('Please, switch the keyboard to Alphabet type mode to play this game!');
		}

		// Set walker to jump
		if (evtMap.keyUp && evtMap.keyUp.fired){
			if (bxg.player.data.state == 1){
				bxg.player.data.pwalker.va.velocity = 180;
				bxg.player.data.state = 3;
			}
		}
		
		// Throw knife
		if (evtMap.keyFire && evtMap.keyFire.fired){
			IPlayerManager.throwKnife(bxg.player);
		}
	}
	,onReset: function(/*CControl*/control)
	{
		// Scroll map to the start position
		control.scroll(0, 0);
		bxg.g.cntlDistantView.scroll(0, 0);
		
		// Load level data
		control.level.load();
		bxg.g.cntlDistantView.level.load();
		
		// Activate player and start from init position
		bxg.player.activate();
		
		// Init internal data
		control.data._scroll = {result:{}};	// Scroll related information
	}
	,onTick: function(/*CControl*/control, /*Number*/tickId)
	{
		// Scroll controls by easing timing function.
		// Give 60% of scroll speed to bxg.g.cntlDistantView to make parallax scroll effect.
		if (control.data._scroll.start){
			var scrolled;
			
			control.data._scroll._s = parseInt(bxg.Easing.outQuad(tickId-control.data._scroll.start, 0, control.data._scroll.amount, 30));
			
			control.scroll(-(control.data._scroll._s - control.data._scroll.pre), 0, control.data._scroll.result);

			if (control.data._scroll.result.x){
				bxg.g.cntlDistantView.scroll(parseInt(0.6*control.data._scroll.result.x), 0);
				
				control.data._scroll.pre = control.data._scroll._s;
			
				if (control.data._scroll._s == control.data._scroll.amount) delete control.data._scroll.start;
			}
			else{
				delete control.data._scroll.start;
			}
		}

		// Start scroll when player get to the end of Screen
		if (bxg.player.position(true).x + bxg.player.size.w  > control.area.w*0.8){
			control.data._scroll.start = tickId;
			control.data._scroll.amount = parseInt(control.area.w*0.8);
			control.data._scroll.pre = 0;
		}
	}
}


////////////////////////////////////////////////////////////////////////////////
// Game core

bxg.onGame = function()
{
	bxg.c.render = bx.$getParamFromURL(location.href, 'RD') || 'canvas';
	bxg.c.tick = 40; 			//msec
	bxg.c.scrSize = {w:720, h:320};
	
	// Initialize BXG engine, aligning in page center
	bxg.init({x:0, y:0, w:bxg.c.scrSize.w, h:bxg.c.scrSize.h}, {renderer:bxg.c.render, align:{x:'center', y:'center'}, onInit:onBxgInit});
}

function onBxgInit(result)
{
	// Turn on waiting-box for game loading
	bx.UX.waitBox(true, "Loading...");

	// bxg.g.objs[] is in objs.js
	
	// Register object templates to the object factory
	// Object list are stored at bxg.g.objs by 'objs.js'	
	var objIdList = [];

	for(var obj = 0; obj < bxg.g.objs.length; obj ++){
		bxg.ObjectFactory.register(bxg.g.objs[obj]);
		
		objIdList.push(bxg.g.objs[obj].type);
	}

	// Load image resource of ObjectFactory-managed game objects
	bxg.ObjectFactory.load(objIdList, onLoadObjects);
}

function onLoadObjects(/*Number*/loaded, /*Number*/failed)
{
	// Setup scrollable game control by give type.
	// 'size' options is not important here, the control area size will be set after loading level data by its size.
	bxg.c.idLevel = 'lvl.bxg.sample.knight.1'; // id of level data file
	
	bxg.g.cntlDistantView = new bxg.C1WayBufferedScrollControl(undefined, {zIndex:0, dir:'left', size:bxg.c.scrSize.w*2}).create();
	bxg.g.cntlCloseRangeView = new bxg.C1WayBufferedScrollControl(IScrollManager, {zIndex:1, dir:'left', size:bxg.c.scrSize.w*2}).create();
	
	bxg.g.levelLoaded = 0;
	
	bxg.g.layerDistantView = new bxg.CTileMapLevel();
	bxg.g.layerDistantView.createFromFile(bxg.g.cntlDistantView, {idLevel:bxg.c.idLevel, idControl:'distantView', onResult:onLoadLevel});
	
	bxg.g.layerCloseRangeView = new bxg.CTileMapLevel();
	bxg.g.layerCloseRangeView.createFromFile(bxg.g.cntlCloseRangeView, {idLevel:bxg.c.idLevel, idControl:'closeRangeView', onResult:onLoadLevel});
}

function onLoadLevel(/*Boolean*/succ)
{
	if (succ) bxg.g.levelLoaded++;

	// Wait until 2 CControls are loaded.
	if (bxg.g.levelLoaded == 2) onReady();
}

function onReady()
{	
	// Turn off waiting-box
	bx.UX.waitBox(false);
	
	// Create and add player object, not by Object-factory
	bxg.player = bxg.g.cntlCloseRangeView.add(bxg.ObjectFactory.build('obj.knight', {zIndex:bxg.g.layerCloseRangeView.getTileMap().getZindex('ground', 'player')}));
	
	// Add input device
	//   CAccelerometerDevice&CTapDevice for touch devic (This sample doesn't check if there is the accelerometer available.
	//   CKeyDevice for PC
	if (bx.HCL.DV.hasTouchEvent()){
		bxg.game.addInputDevice(new bxg.CAccelerometerDevice({
				keyLeft:{x:{max:-1, min:-10}, type:'event'},
				keyRight:{x:{max:10, min:1}, type:'event'}
			})
		);
		
		bxg.game.addInputDevice(new bxg.CTapDevice({
				keyUp:{area:{x:0, y:0, w:bxg.area.w*0.5, h:bxg.area.h}, type:'event'}
				,keyFire:{area:{x:bxg.area.w*0.5, y:0, w:bxg.area.w*0.5, h:bxg.area.h}, type:'event'}
			})
		);
	}
	else{
		bxg.game.addInputDevice(new bxg.CKeyDevice(
			{
				keyUp:{key:'keyUp', type:'polling'}
				,keyLeft:{key:'keyLeft', type:'polling'}
				,keyRight:{key:'keyRight', type:'polling'} 
				,keyFire:{key:'keyZ', type:'event'} 
				,errorIME:{key:'keyErrorIME', type:'event'}
			}
			,{multi:true}
		));
	}
	
	// Game start
	bxg.game.init({tick:bxg.c.tick});
	bxg.game.addControl(bxg.g.cntlDistantView);
	bxg.game.addControl(bxg.g.cntlCloseRangeView);

	bxg.game.run();
	
	// Display inspector console for performance monitoring
	bxg.Inspector.createConsole({consolePerformanceFull:true, consoleObjectFactory:true, consoleRenderer:true});
}
