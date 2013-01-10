////////////////////////////////////////////////////////////////////////////////
// Common object manager for parabollic movement

"Copyright ⓒ 2009-2012 BLUEGA Inc.";
"This sample game source is licensed under the MIT license."

/* Meta sprites; It means that these predefined sprite state will be applied if it has.
	metaStateLeft  : sprite state for moving left
	metaStateRight : sprite state for moving right
	metaStateDying : sprite state for dying
	
	metaTargetHP: HP
*/

ICommonParabolicManager = {
	onActivate: function(/*Object*/obj, /*Number*/tickId)
	{
		if (!obj.data || !obj.data.manager || !obj.data.manager.motion) return;
		
		// Default values if not
		obj.data.manager.action = obj.data.manager.action || {onOut:1, onObstacle:1};
		obj.data.manager.bottomOffset = obj.data.manager.bottomOffset || {left:0, right:0};
		obj.data.manager.sideOffset = obj.data.manager.sideOffset || {x:0, y:parseInt(obj.size.h*0.5)}
		obj.data.manager.sprites = obj.data.manager.sprites || {};

		// Default values if not
		if (!obj.data.manager.motion.elasticX) obj.data.manager.motion.elasticX = 1;
		if (!obj.data.manager.motion.elasticY) obj.data.manager.motion.elasticY = 1;
		if (!obj.data.manager.motion.vx) obj.data.manager.motion.vx = 0;
		if (obj.data.manager.motion.gravity === undefined) obj.data.manager.motion.gravity = 1; // Gravity must be greater than 0 in order to make object fall. 
		if (!obj.data.manager.motion.velocity) obj.data.manager.motion.velocity = 1; 
		if (!obj.data.manager.initState) obj.data.manager.initState = 1;
		
		obj.data.pwalker = {
			gravity: obj.data.manager.motion.gravity,
			velocity: obj.data.manager.motion.velocity,
			dTime: bxg.game.tickInterval/1000,
			collision:null
		};
		obj.data.onTileY = 0;
		obj.data.onTile = false;
		
		obj.data.tileMap = obj.control.level.getTileMap();
		obj.data.__statePre = 0;
		obj.data.dx = (obj.data.manager.motion.baseTick ? bxg.game.adjustByTick(obj.data.manager.motion.baseTick, obj.data.manager.motion.vx, true):obj.data.manager.motion.vx);

		obj.data.state = obj.data.manager.initState;

		obj.show();
	}
	,onTick:function(/*Object*/obj, /*Number*/tickId)
	{
		if (!obj.data || !obj.data.manager || !obj.data.manager.motion) return;

		// Check if the object is on obstacle tile.
		obj.data.onTile = obj.data.tileMap.checkObstacleByPosition(obj.position().x + obj.data.manager.bottomOffset.left, obj.position().y + obj.size.h+1, 4);
		if (obj.data.onTile === null){
			obj.data.onTile = obj.data.tileMap.checkObstacleByPosition(obj.position().x + obj.size.w - obj.data.manager.bottomOffset.right, obj.position().y + obj.size.h+1, 4);
		}
		
		if (obj.data.onTile !== null){
			obj.data.onTileY = obj.data.onTile;
			obj.data.onTile = true;
		}
		
		// Check if the object is bump with obstacle tile in left or right direciton.
		if ((obj.data.tileMap.checkObstacleByPosition(obj.position().x + obj.data.manager.sideOffset.x, obj.position().y + obj.size.h - obj.data.manager.sideOffset.y, 2) !== null && obj.data.dx < 0)
			|| (obj.data.tileMap.checkObstacleByPosition(obj.position().x + obj.size.w - obj.data.manager.sideOffset.x, obj.position().y + obj.size.h - obj.data.manager.sideOffset.y, 6) !== null && obj.data.dx > 0)){
			
			if (obj.data.manager.action.onObstacle == 2){ // Jump
				if (obj.data.state == 2){
					// Put the object on the top of obstacle. If not, it will collide with same obstacle again.
					obj.moveBy(0, -(obj.size.h - obj.data.manager.sideOffset.y + 1));
					
					obj.data.pwalker.velocity = obj.data.manager.motion.velocity;
					obj.data.state = 3;
				}
				else if (obj.data.state == 31){
					obj.data.dx *= -1;
				}
			}
			else if (obj.data.manager.action.onObstacle == 1){ // Turn back
				obj.data.dx *= -1;
			}
			else if (obj.data.manager.action.onObstacle == 3){ // Deactivate
				obj.deactivate();
				return;
			}
			else{
				obj.data.dx = 0;	// Stay 
			}
		}
		
		// Set meta sprite states if it has.
		if (obj.data.dx < 0){
			if (obj.hasSpriteState('metaStateLeft')) obj.setCurSpriteState('metaStateLeft');
		}
		else if (obj.data.dx > 0){
			if (obj.hasSpriteState('metaStateRight')) obj.setCurSpriteState('metaStateRight');
		}
		
		// If HP is ran out, transit to dying state.
		if (obj.data.metaTargetHP == 0 && obj.data.state != 4){
			if (obj.hasSpriteState('metaStateDying')) obj.setCurSpriteState('metaStateDying');
			obj.data.dx = 0;
			
			// Deactivate after 1000msec
			obj.data._tkDead = bxg.game.tickAfter(tickId, 1000);
			obj.data.state = 4;
		}
		
		// State machine(diagram)
		switch(obj.data.state){
		case 1: // Idle
			break;
			
		case 2: // Jumping end and walking
			if (!obj.data.onTile){
				obj.data.pwalker.velocity = 0;
				obj.data.state = 3;
				break;
			}
			break;
		
		case 3: // Jumping start
			if (obj.data.manager.motion.gravity){
				bxg.WalkerParabolic2D.set(obj, obj.data.pwalker);
				obj.data.state = 31;
			}
			else break;
		case 31: // Jumping
			obj.data.pwalker.collision = null;
			
			// Collision check with view screen
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
			
		case 4: // Dying
			if (tickId >= obj.data._tkDead){
				obj.deactivate();
			}
			break;
		}
		
		// If it has, apply sprite states on state transition.
		if (obj.data.__statePre != obj.data.state){
			if (obj.data.manager.sprites[obj.data.state]){
				for(obj.data.__i = 0; obj.data.__i < obj.data.manager.sprites[obj.data.state].length; obj.data.__i ++){
					if (obj.data.__i == 0){
						obj.setCurSpriteState(obj.data.manager.sprites[obj.data.state][obj.data.__i]);
					}
					else{
						obj.queueSpriteState(obj.data.manager.sprites[obj.data.state][obj.data.__i]);
					}
				}
			}
		}
		obj.data.__statePre = obj.data.state;

		if (obj.data.state > 1){
			// If in view screen, process the movemet on X axis.
			if (!obj.overViewScreen()){
				obj.moveBy(obj.data.dx, 0);
	
				if (obj.data.dxPolling && obj.data.state != 31){
					obj.data.dx = 0;
					obj.data.dxPolling = false;
				}
			}
			else {
				if (obj.data.manager.action.onOut == 0){ // Just out
					obj.moveBy(obj.data.dx, 0);
				}
				else if (obj.data.manager.action.onOut == 1){ // Deactivate
					obj.deactivate();
				}
				else if (obj.data.manager.action.onOut == 2){ // Stay/stuck
					obj.data.dx = 0;
				}
			}
		}
	}
	,onWalkerEnd:function(/*Object*/obj, /*Number*/tickId)
	{
		// The object is stand on the tile after jumping.
		// Apply modulus of elasticity and bound back.
		if (obj.data.pwalker.collision == 4){
			obj.data.pwalker.velocity = parseInt(obj.data.pwalker.velocity*obj.data.manager.motion.elasticY);
			obj.data.dx = parseInt(obj.data.dx*obj.data.manager.motion.elasticX);
			
			obj.move(undefined, obj.data.onTileY - obj.size.h);
			
			if (obj.data.manager.motion.elasticY != 1){
				obj.data.state = 3;
			}
			else{
				obj.data.state = 2;
			}
		}
		else if (obj.data.pwalker.collision == 0){ // Bump with obstacle by the head(top)
			obj.data.pwalker.velocity *= -1; // Bounce back with the same velocity (So, just switch the sign)
			obj.data.state = 3;
		} 
	}
};
