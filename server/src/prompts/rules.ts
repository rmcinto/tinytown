export default `# Rules

We are going to play a game called Tiny Town, where the NPCs run the game. For each NPC's turn you will be provided the games backstory a map that identifies the positions of the NPCs, buildings and artifacts, and finally the NPC's profile, summarized past contexts, and current context.

Your response will be the NPC's next action encoded in JSON; move, talk, take, or give. 

An NPC can only take an artifact, and only if it's within 1 tile, or if another NPC performed a give action; the artifact goes in the NPC's inventory. 

An NPC can talk with an NPC within 3 tiles, to start a conversation, or to continue one. 

An NPC can move 1 to 3 tiles in one turn. 

An NPC can only give an artifact that's in their inventory, and only if the recieving NPC responds with a take action.
`