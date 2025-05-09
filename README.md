# Tank Battle Game

A 2D tank shooting game where you control a tank to destroy enemy tanks while avoiding their fire.

## Features

- Player tank movement: forward, backward, left, right rotation
- Bullet firing with cooldown
- Enemy tanks with AI behavior
- Collision detection for bullets and tanks
- Health bars for all tanks
- Score counter
- Game Over screen with restart button
- Responsive layout with CSS

## Controls

- **Arrow Keys / WASD**: Move the tank
- **Space**: Fire bullets
- **R**: Restart game (when game is over)

## AI Behavior

The enemy tanks utilize basic AI logic:
- Rotate to face the player
- Move toward the player when far away
- Maintain a safe distance when close
- Fire when aimed correctly at the player
- Dodge based on distance

## How to Play

1. Open `index.html` in a web browser
2. Use the arrow keys or WASD to move your tank
3. Press space to fire bullets at enemy tanks
4. Destroy enemy tanks to earn points
5. Avoid enemy bullets to stay alive
6. After game over, press R or click Restart to play again

## Implementation Details

- Built with HTML5 Canvas for rendering
- Pure JavaScript for game logic
- CSS for styling and UI elements
- No external libraries or dependencies required

## Future Enhancements

- Power-ups (shield, rapid fire, etc.)
- Multiple levels with increasing difficulty
- Different enemy tank types
- Sound effects and background music
- Responsive design for mobile devices # Battle-Tank-Game
