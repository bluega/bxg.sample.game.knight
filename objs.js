////////////////////////////////////////////////////////////////////////////////
// Object managers and objects

////////////////////////////////////////////////////////////////////////////////
// Player manager
"Copyright ⓒ 2009-2012 BLUEGA Inc.";
"This sample game source is licensed under the MIT license."

IPlayerManager = {
	onActivate: function(/*Object*/obj, /*Number*/tickId)
	{
		obj.data.metaTargetHP = 2;
		obj.data.shieldTime = bxg.game.tickAfter(tickId, 2000); // Protect for 2sec after hit by enemy
		obj.data.pwalker = {
			va:{
				velocity:180
				,angle:0
				//,gravity:12
			}
			,dTime:bxg.game.tickInterval/1000
			,collision:null
			,player:true
		};
		obj.data.speed = bxg.game.adjustByTick(60, 4, true);
		
		obj.data._checkScreen = {};
		obj.data.onTileY = 0;
		obj.data.onTile = false;
		obj.data.dx = 0;
		obj.data.dir = 'R';	// Left or Right direction
		
		obj.data.tileMap = obj.control.level.getTileMap();
		
		obj.data.state = 1;
		
		obj.data.startPosition = obj.data.startPosition || {};
		obj.data.startPosition = obj.control.toControlScreenPosition(20, 20, obj.data.startPosition);
		obj.move(obj.data.startPosition.x, obj.data.startPosition.y);	// Move to start position
		
		obj.show();
		obj.useCollisionDetection(true);
	}
	,onTick:function(/*Object*/obj, /*Number*/tickId)
	{
		// Dying state
		if (obj.data.state == 1001){
			if (tickId > obj.data._deadTime){
				obj.deactivate();
				obj.activate();
				return;
			}
		}
		
		// Check if the object is on the obstacle tile.
		obj.data.onTile = obj.data.tileMap.checkObstacleByPosition(obj.position().x + 15, obj.position().y + obj.size.h, 4, obj.data.tileMap);
		if (obj.data.onTile === null){
			obj.data.onTile = obj.data.tileMap.checkObstacleByPosition(obj.position().x + obj.size.w - 15, obj.position().y + obj.size.h, 4, obj.data.tileMap);
		}
		
		if (obj.data.onTile !== null){
			obj.data.onTileY = obj.data.onTile;
			obj.data.onTile = true;
		}
		
		// Check if the object is bump with obstacle tile in left or right direciton.
		if (obj.data.tileMap.checkObstacleByPosition(obj.position().x, obj.position().y + obj.size.h/2, 2, obj.data._tileMap) !== null && obj.data.dx < 0){
			obj.data.dx = 0;
		}
		if (obj.data.tileMap.checkObstacleByPosition(obj.position().x + obj.size.w, obj.position().y + obj.size.h/2, 6, obj.data.tileMap) !== null && obj.data.dx > 0){
			obj.data.dx = 0;
		}
		
		// In guarded state after hit by enemy.
		if (obj.data.shieldTime > 0 && tickId > obj.data.shieldTime){
			obj.data.shieldTime = 0;
		}
		
		// Get moving direction. Even if the player is stopped, the last direction can be known by this value.
		if (obj.data.dx < 0) obj.data.dir = 'L';
		else if (obj.data.dx > 0) obj.data.dir = 'R';
		
		// State machine
		switch(obj.data.state){
		case 1: // Run or stand
			// If player is not on the tile, it means that it will fall down.
			if (!obj.data.onTile){
				obj.data.pwalker.va.velocity = 0;
				
				obj.data.state = 3;
				break;
			}
			
			// Set sprite status
			if (obj.data.dx){
				obj.setCurSpriteState('run'+obj.data.dir+obj.data.metaTargetHP);
			}
			else{
				obj.setCurSpriteState('stand'+obj.data.dir+obj.data.metaTargetHP);
			}

			break;
		
		case 3: // jumping start
			bxg.WalkerParabolic2D.set(obj, obj.data.pwalker); 
			
			obj.control.scroll(0, 10); // Shake the land level
			
			obj.data.state = 31;
		case 31: // jumping
			if (obj.data.dx < 0) obj.setCurSpriteState('jumpL'+obj.data.metaTargetHP);
			else obj.setCurSpriteState('jumpR'+obj.data.metaTargetHP);
			
			obj.data.pwalker.collision = null;
			
			// Check out the collision with view screen
			if (obj.position().y < 0){
				obj.data.pwalker.collision = 0;
			}
			else if (obj.position().y > (bxg.area.h - obj.size.h - 1)){
				obj.data.pwalker.collision = 4;
				
				obj.data.onTileY = bxg.area.h - 1;
			}
			
			if ((obj.position().x + obj.data.dx) < 0){
				obj.data.pwalker.collision = 2;
			}
			else if ((obj.position().x + obj.data.dx) > (bxg.area.w - obj.size.w)){
				obj.data.pwalker.collision = 6;
			}
			
			if (obj.data.onTile){
				obj.data.pwalker.collision = 4;
			}
			
			bxg.WalkerParabolic2D.move(obj, obj.data.pwalker);
			
			break;
		
		case 1000: //dead
			obj.setCurSpriteState('dead');
			obj.queueSpriteState('dead1');
			
			obj.data._deadTime = bxg.game.tickAfter(tickId, 1000);
			
			obj.data.state = 1001;

			break;
		}
		
		// Move if the object is in view screen.
		if (obj.data.state < 1000){
			obj.overViewScreen(obj.data._checkScreen);
			
			if (!obj.data._checkScreen.x || (obj.data._checkScreen.x == 1 && obj.data.dx >= 0) || (obj.data._checkScreen.x == 2 && obj.data.dx <= 0)){
				obj.moveBy(obj.data.dx, 0);
	
				if (obj.data.dxPolling && obj.data.state != 31){
					obj.data.dx = 0;
					obj.data.dxPolling = false;
				}
			}
		}
	},
	onWalkerEnd:function(/*Object*/obj, /*Number*/tickId)
	{
		obj.control.scroll(0, -10); // Shake back the land level
		
		if (obj.data.state >= 1000) return;
		
		// The player is stand on the tile after jumping
		if (obj.data.pwalker.collision == 4){
			obj.data.state = 1;
			
			obj.move(undefined, obj.data.onTileY - obj.size.h);
		}
		else if (obj.data.pwalker.collision == 0){ // Bump with obstacle by the head(top)
			obj.data.pwalker.va.velocity *= -1; // Bounce back with the same velocity (So, just switch the sign)
			obj.data.state = 3;
		} 
	},
	onCollision:function(/*Object*/obj, /*Object*/hit)
	{
		if (obj.data.state >= 1000) return;
		
		if (hit.type == 'obj.coin' && hit.data.state == 1){ // Get coin
			hit.data.state = 3;
		}
		else if (hit.type == 'obj.girl' && hit.data.state == 1){ // Release girl
			hit.data.state = 2;
		}
		else if (hit.type == 'obj.armor'){ // Get armor, it will restore HP
			hit.deactivate();
			
			// Restore HP
			if (obj.data.metaTargetHP < 2) obj.data.metaTargetHP ++;
		}
		else if ((hit.type == 'obj.enemy.zombie' && hit.data.metaTargetHP > 0) || (hit.type == 'obj.enemy.boss' && hit.data.metaTargetHP > 0) || (hit.type == 'obj.enemy.bat' && hit.data.metaTargetHP > 0) || hit.type == 'obj.test.hscroll.fireball'){
			// Hit by enemy or enemy shot
			if (obj.data.shieldTime == 0 || bxg.game.getTick() > obj.data.shieldTime){
				if (obj.data.metaTargetHP > 1){
					obj.data.metaTargetHP --;

					obj.data.shieldTime = bxg.game.tickAfter(bxg.game.getTick(), 3000);
					
					obj.data.dx = -obj.data.speed;
					obj.data.state = 3;
				}
				else{
					obj.data.dx = 0;
					obj.data.state = 1000;
				}
			}
		}
	}
	,throwKnife:function(/*Object*/obj)
	{
		// Make knife shot object pool
		// It is ok to make it here. (No need to destory these pool in this game.)
		if (!IPlayerManager.poolShotL){
			var shot, i;
			
			// Make knife pool for left direction
			IPlayerManager.poolShotL = new bxg.CObjectPool();
			
			for(i = 0; i < 6; i ++){
				if (shot = bxg.ObjectFactory.build('obj.shot', {zIndex:obj.getZindex()})){
					shot.data.dx = -bxg.game.adjustByTick(60, 6, true);
					IPlayerManager.poolShotL.add(shot);
				}
			}
			IPlayerManager.poolShotL.addToControl(obj.control);
			
			// Make knife pool for right direction
			IPlayerManager.poolShotR = new bxg.CObjectPool();
			
			for(i = 0; i < 6; i ++){
				if (shot = bxg.ObjectFactory.build('obj.shot', {zIndex:obj.getZindex()})){
					shot.data.dx = bxg.game.adjustByTick(60, 6, true);
					IPlayerManager.poolShotR.add(shot);
				}
			}
			IPlayerManager.poolShotR.addToControl(obj.control);
		}

		// Throw a knife if available
		var shot;
		
		if (obj.data.dir == 'L'){ // Left
			if (shot = IPlayerManager.poolShotL.searchFree()){
				shot.move(obj.position().x-shot.size.w, obj.position().y+24);
				shot.activate();
			}
		}
		else{ // Right
			if (shot = IPlayerManager.poolShotR.searchFree()){
				shot.move(obj.position().x+obj.size.w, obj.position().y+24);
				shot.activate();
			}
		}
	}
};

////////////////////////////////////////////////////////////////////////////////
// Boss manager derived from ICommonParabolicManager

IBossManager = {
	onActivate: function(/*Object*/obj, /*Number*/tickId)
	{
		// Make firball shot object pool
		// This manager is only for boss object, so, it is ok to make it here. (No need to destory these pool in this game.)
		if (!IBossManager.poolShot){
			IBossManager.poolShot = new bxg.CObjectPool();
			
			for(var i = 0; i < 10; i ++){
				// set Z-index same with boss object, this is easy trick to find Z-index in tilemap.
				IBossManager.poolShot.add(bxg.ObjectFactory.build('obj.fireball', {zIndex:obj.getZindex()}));
			}
			
			IBossManager.poolShot.addToControl(obj.control);
		}
		
		ICommonParabolicManager.onActivate(obj, tickId);
	}
	,onTick: function(/*Object*/obj, /*Number*/tickId)
	{
		ICommonParabolicManager.onTick(obj, tickId);
		
		obj.data.manager = obj.data.manager || {};
		obj.data.metaShotCount = obj.data.metaShotCount || 10;

		// Attack on every 6000msec
		if (!obj.data._tkAttack) obj.data._tkAttack = bxg.game.tickAfter(tickId, 6000); 

		if (obj.data.state == 2 && tickId >= obj.data._tkAttack){
			obj.setCurSpriteState('attack', true);
			obj.queueSpriteState('walk');

			obj.data.state = 100;
		}
		else if (obj.data.state == 100){
			if (obj.doesCurSpritePlayEnd()){
				var shot;
				var vx = -2*parseInt(obj.data.metaShotCount/2);
				var count = 0;
				
				// Scatter fileballs
				while(shot = IBossManager.poolShot.searchFree()){
					shot.move(obj.position().x+10, obj.position().y+obj.size.h-shot.size.h-6);
					shot.data.manager.motion.vx = bxg.game.adjustByTick(60, vx, true);
					shot.data.manager.motion.velocity = 180 - Math.abs(vx)*5;
					shot.activate().show();
					shot.setCurSpriteState('explode0');
					shot.queueSpriteState('explode1', true);
					
					vx = (vx == -2 ? 2 : vx + 2);
					count ++;
					
					if (count >= obj.data.metaShotCount) break;
				}
			}
			
			// Switch direction and walking state. Set next attack time aroun 6000msec
			if (obj.getCurSpriteState() == 'walk'){
				obj.data._tkAttack = bxg.game.tickAfter(tickId, (Math.random()+0.5)*6000);
				
				obj.data.dx *= -1;
				obj.data.state = 2;
			}
		}
	},
	onWalkerEnd:function(/*Object*/obj, /*Number*/tickId)
	{
		ICommonParabolicManager.onWalkerEnd(obj, tickId);
	}
};

////////////////////////////////////////////////////////////////////////////////
// Knife(Player shot) manager

IKnifeManager = {
	onActivate: function(/*Object*/obj, /*Number*/tickId)
	{
		obj.data.moveCount = 30; // Tick count to move the knife
		
		if (obj.data.dx < 0){
			obj.setCurSpriteState('metaStateLeft');
		}
		else{
			obj.setCurSpriteState('metaStateRight');
		}

		obj.show();
	}
	,onTick: function(/*Object*/obj, /*Number*/tickId)
	{
		// Just move given speed, given direction in given tick count.
		obj.moveBy(obj.data.dx, 0);
		
		obj.data.moveCount --;
		
		if (obj.data.moveCount < 0) obj.deactivate();
	}
	,onCollision: function(/*Object*/obj, /*Object*/hit)
	{
		if (hit.data.metaTargetHP > 0 && hit !== bx.player){
			// Decrease HP of hit object.
			hit.data.metaTargetHP --;
			
			obj.deactivate();
		}
	}
	,onOutView: function(/*Object*/obj)
	{
		obj.deactivate();
	}
}

////////////////////////////////////////////////////////////////////////////////
// Bat manager - Simplge homing shot

IHomingShotManger = {
	onActivate: function(/*Object*/obj, /*Number*/tickId)
	{
		obj.data.speed = bxg.game.adjustByTick(60, 5, true);
		obj.data.state = 0;
		obj.data._tkDead = 0;
		
		obj.show();
	}
	,onTick: function(/*Object*/obj, /*Number*/tickId)
	{
		// Need distance and angle from the object to bxg.player.
		obj.data._angle = bxg.Geometry.getAngle(obj.center(), bxg.player.center());
		
		// At start, setup homing direction to bxg.player
		switch(obj.data.state){
		case 0: // Chase player
			bxg.WalkerLinear.set(obj, {speed:obj.data.speed, radian:bxg.Geometry.getDegToRad(obj.data._angle)});

			obj.data.tickTurn = parseInt(Math.random()*30);
			obj.data.state = 1;
			
			break;
		
		case 1: // If chasing is over, then check out the bxg.player's position.(It transits to state = 0.)
			bxg.WalkerLinear.move(obj);
			
			obj.data.tickTurn --;
			
			if (obj.data.tickTurn < 0) obj.data.state = 0;
			
			break;
		}
		
		// Dying state
		if (obj.data.metaTargetHP == 0 && obj.data.state != 99){
			if (obj.hasSpriteState('metaStateDying')) obj.setCurSpriteState('metaStateDying');
			
			// Deactivate after 1000msec
			obj.data._tkDead = bxg.game.tickAfter(tickId, 1000);
			obj.data.state = 99;
		}
		
		// After dying, deactivate this object.
		if (obj.data._tkDead && tickId > obj.data._tkDead){
			obj.deactivate();
		}
	}
}

////////////////////////////////////////////////////////////////////////////////
// Objects

bxg.g.objs = [
{
	id:'obj.knight'
	,imagePath:'imgs/obj.knight'
	,images:{
		playerR:{url:'brave_R_48x46.png', sprite:{size:{w:48, h:46}, cols:28, count:28}}
		,playerL:{url:'brave_L_48x46.png', sprite:{size:{w:48, h:46}, cols:28, count:28}}
	}
	,info:{
		standR2:{sprite:['playerR1']}
		,standL2:{sprite:['playerL28']}
		,runR2:{sprite:['playerR1', 'playerR2', 'playerR3', 'playerR4']} 
		,runL2:{sprite:['playerL28', 'playerL27', 'playerL26', 'playerL25']}
		,jumpR2:{sprite:['playerR6']}
		,jumpL2:{sprite:['playerL23']}
		,standR1:{sprite:['playerR12']}
		,standL1:{sprite:['playerL17']}
		,runR1:{sprite:['playerR13', 'playerR14', 'playerR15', 'playerR16']} 
		,runL1:{sprite:['playerL16', 'playerL15', 'playerL14', 'playerL13']}
		,jumpR1:{sprite:['playerR17']}
		,jumpL1:{sprite:['playerL12']}
		,dead:{sprite:['playerR24', 'playerR25', 'playerR26', 'playerR27', 'playerR28']}
		,dead1:{sprite:['playerR28']}
	}
	,options:{
		manager:IPlayerManager
		,cdShape:[{rect:{x:14, y:13, w:20, h:20}}]
	}
}
,{
	id:'obj.enemy.zombie'
	,imagePath:'imgs/obj.enemy.zombie'
	,images:{
		zombieL:{url:'zombie_L_29x40.png', sprite:{size:{w:29, h:40}, cols:4, count:4}},
		zombieR:{url:'zombie_R_29x40.png', sprite:{size:{w:29, h:40}, cols:4, count:4}},
		zombieL_D:{url:'zombie_L_29x40.png', sprite:{size:{w:29, h:40}, cols:4, count:4}, opacity:0.3}
	}
	,info:{
		metaStateLeft:{sprite:['zombieL1', 'zombieL2', 'zombieL3', 'zombieL4']}
		,metaStateRight:{sprite:['zombieR1', 'zombieR2', 'zombieR3', 'zombieR4']}
		,metaStateDying:{sprite:['zombieL1', 'zombieL_D1', 'zombieL2', 'zombieL_D2']}
	}
	,options:{
		manager:ICommonParabolicManager
		,cdShape:[{rect:{x:0, y:0, w:29, h:40}}]
	}
	,config:{ // Additional configuration data which is supposed to be applied to object.data{}
		manager:{
			motion:{
				gravity: 10,
				velocity: 120,
				vx: -4,
				baseTick:60
			},
			action:{onOut: 0, onObstacle: 2},
			bottomOffset:{left:6, right:6},
			sideOffset:{x:2, y:24},
			initState:2
		},
		metaTargetHP: 2
	}
}
,{
	id:'obj.coin'
	,imagePath:'imgs/obj.coin'
	,images:{
		coinSP:{url:'coin_32x32.png', sprite:{size:{w:32, h:32}, cols:8, count:8}}
	}
	,info:{
		normal:{sprite:['coinSP1', 'coinSP2', 'coinSP3', 'coinSP4', 'coinSP5', 'coinSP6', 'coinSP7', 'coinSP8']}
	}
	
	,options:{
		manager:ICommonParabolicManager
		,cdShape:[{circle:{x:15, y:15, r:15}}]
	}
	,config:{
		manager:{
			motion:{
				gravity: 14,
				velocity: 240,
				elasticY: 0.75,
				vx: -6,
				baseTick:60
			},
			bottomOffset:{left:10, right:10},
			sideOffset:{x:0, y:24},
			initState:1
		}
	}
}
,{
	id:'obj.enemy.bat'
	,imagePath:'imgs/obj.enemy.bat'
	,images:{
		batSP:{url:'enemy3_29x35.png', sprite:{size:{w:29, h:35}, cols:3, count:3}}
		,batSP_D:{url:'enemy3_29x35.png', sprite:{size:{w:29, h:35}, cols:3, count:3}, opacity:0.3}
	}
	,info:{
		normal:{sprite:['batSP1', 'batSP2', 'batSP2', 'batSP3']}
		,metaStateDying:{sprite:['batSP1', 'batSP_D1', 'batSP2', 'batSP_D2', 'batSP3', 'batSP_D3']}
	}
	,config:{
		metaTargetHP:3
	}
	,options:{
		manager:IHomingShotManger
		,cdShape:[{rect:{x:0, y:0, w:29, h:35}}]
	}
}
,{
	id:'obj.girl'
	,imagePath:'imgs/obj.girl'
	,images:{
		girlSP:{url:'girl_24x46.png', sprite:{size:{w:24, h:46}, cols:8, count:8}}
	}
	,info:{
		normal:{sprite:['girlSP1', 'girlSP2', 'girlSP3']}
		,release:{sprite:['girlSP4']}
		,run:{sprite:['girlSP5', 'girlSP6', 'girlSP7', 'girlSP8']}
	}
	,options:{
		manager:ICommonParabolicManager
		,cdShape:[{rect:{x:0, y:0, w:24, h:46}}]
		,sprite:{speed:5}
	}
	,config:{
		manager:{
			motion:{
				gravity: 10,
				velocity: 120,
				vx: -10,
				baseTick: 60
			},
			bottomOffset:{left:10, right:10},
			action:{onOut: 1, onObstacle: 3},
			sprites:{
				'2':['release','run']
			},
			initState:1
		}
	}
}
,{
	id:'obj.armor'
	,imagePath:'imgs/obj.armor'
	,images:{
		armor:{url:'armor.png'}
	}
	,info:{
		normal:{sprite:['armor']}
	}
	,options:{
		cdShape:[{rect:{x:1, y:0, w:28, h:30}}]
	}
}
,{
	id:'obj.enemy.boss'
	,imagePath:'imgs/obj.enemy.boss'
	,images:{
		bossSP:{url:'boss_85x94.png', sprite:{size:{w:85, h:94}, cols:12, count:12}}
		,bossSP_D:{url:'boss_85x94.png', sprite:{size:{w:85, h:94}, cols:12, count:12}, opacity:0.3}
	}
	,info:{
		walk:{sprite:['bossSP9', 'bossSP10', 'bossSP11', 'bossSP12']}
		,metaStateDying:{sprite:['bossSP1', 'bossSP_D1']}
		,attack:{sprite:['bossSP5', 'bossSP5', 'bossSP5', 'bossSP5', 'bossSP5', 
			'bossSP6', 'bossSP6', 'bossSP6', 'bossSP6',
			'bossSP7', 'bossSP7', 'bossSP7', 
			'bossSP8', 'bossSP8', 'bossSP8']}
	}
	,options:{
		manager:IBossManager
		,cdShape:[{rect:{x:10, y:34, w:65, h:60}}]
	}
	,config:{
		manager:{
			motion:{
				gravity: 10,
				velocity: 100,
				vx: -3,
				baseTick: 60
			},
			action:{onOut:0, onObstacle: 1},
			sideOffset:{x:0, y:20},
			bottomOffset:{left:20, right:20},
			initState:2
		}
	}
}
,{
	id:'obj.shot'
	,imagePath:'imgs/obj.shot'
	,images:{
		knifeL:{url:'brave_knife_L.png'}
		,knifeR:{url:'brave_knife_R.png'}
	}
	,info:{
		metaStateLeft:{sprite:['knifeL']}
		,metaStateRight:{sprite:['knifeR']}
	}
	,options:{
		manager:IKnifeManager
		,cdShape:[{rect:{x:1, y:0, w:16, h:4}}]
	}
}
,{
	id:'obj.fireball'
	,imagePath:'imgs/obj.fireball'
	,images:{
		fireballSP:{url:'flame_14x16.png', sprite:{size:{w:14, h:16}, cols:8, count:8}}
	}
	,info:{
		explode0:{sprite:['fireballSP1', 'fireballSP2', 'fireballSP3', 'fireballSP4', 'fireballSP5', 'fireballSP6', 'fireballSP7', 'fireballSP8']}
		,explode1:{sprite:['fireballSP7', 'fireballSP8']}
	}
	,options:{
		manager:ICommonParabolicManager
		,cdShape:[{circle:{x:6, y:7, r:6}}]
	}
	,config:{
		manager:{
			motion:{
				gravity: 6,
				velocity: 180,
				elasticY: 0.5,
				baseTick: 60
			},
			action:{onOut:1, onObstacle:3},
			sideOffset:{x:0, y:16},
			initState:3
		}
	}
}	
];
