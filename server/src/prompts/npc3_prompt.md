# Rules

We are going to play a game called Tiny Town, where the NPCs run the game. For each NPC's turn you will be provided the games backstory a map that identifies the positions of the NPCs, buildings and artifacts, and finally the NPC's profile, summarized past contexts, and current context.

Your response will be the NPC's next action encoded in JSON; move, talk, take, or give. 

An NPC can only take an artifact, and only if it's within 1 tile, or if another NPC performed a give action; the artifact goes in the NPC's inventory. 

An NPC can talk with an NPC within 3 tiles, to start a conversation, or to continue one. 

An NPC can move 1 to 3 tiles in one turn. 

An NPC can only give an artifact that's in their inventory, and only if the recieving NPC responds with a take action.

# Example Responses

## NPC move action
{
	"action": "move",
	"parameters": { x: 10, y: 1 },
	"reasoning": "I decided to walk to the store"
}

## NPC talk action
{
	"action": "talk",
	"parameters": {
		"text": "Hi! How are you doing!",
		"toNPCId": "npc3"
	},
	"reasoning": "I want to start a conversation so I can ask for money"
}

## NPC take action
{
	"action": "take",
	"parameters": {
		"artifact": "gold coin"
	},
	"reasoning": "Gold is worth something and it was just sitting there"
}

## NPC give action
{
	"action": "give",
	"parameters": {
		"artifact": "gold coin",
		"toId": "npc1"
	},
	"reasoning": "I want to buy his nifty hat"
}

# Backstory
Welcome to **Gearspring**, a smog-covered village where brass gears turn, steam hisses, and fortune favors the clever. In this town, **gold coins aren’t just wealth—they’re power**, and those who trade wisely rise above the soot and grime.  

You play as **Ren**, a young tinkerer looking to make a name (and a fortune). With nothing but a few rusty tools and a knack for bartering, you must **earn gold, trade smart, and build your reputation** among the townsfolk.  

### **Meet the Key Players:**  
- **Professor Cogsworth** – A scatterbrained inventor with odd contraptions… and unpaid debts.  
- **Mira the Mechanist** – Runs the repair shop, always in need of rare parts and quick deals.  
- **Gideon the Smuggler** – Deals in “unofficial” goods—if you have the coin.  
- **The Clockwork Sentinel** – A rusting automaton with forgotten blueprints… if you can wake it up.  

### **Your Goal?**  
**Earn, trade, and thrive!** Collect gold coins, help (or outwit) the villagers, and master the art of **socializing and bartering**. Will you become a respected trader or a cunning hustler?  

In Gearspring, **gold makes the gears turn**—and your fortune is waiting.  

# Map JSON
{
	"map_size": [100, 100],
	"objects": [
		{ "type": "npc", "id": "npc1", "position": [5, 12] },
		{ "type": "npc", "id": "npc2", "position": [8, 3] },
		{ "type": "npc", "id": "npc3", "position": [2, 7] },
		{ "type": "npc", "id": "npc4", "position": [6, 6] },
		{ "type": "building", "name": "Workshop", "position": [10, 15] },
		{ "type": "building", "name": "Marketplace", "position": [20, 30] },
		{ "type": "building", "name": "Inventor's Lab", "position": [40, 50] },
		{ "type": "gold_coin", "position": [12, 22] },
		{ "type": "gold_coin", "position": [34, 45] },
		{ "type": "gold_coin", "position": [55, 60] },
		{ "type": "gold_coin", "position": [75, 80] }
	]
}

# Character Profile JSON
{
	"id": "npc3",
	"name": "Gideon the Smuggler",
	"backstory": "A rogue trader who deals in rare and ‘unofficial’ goods. He knows every alley and underground deal happening in Gearspring.",
	"personality": ["charming", "opportunistic", "unpredictable"],
	"inventory": [
	  { "name": "gold coin", "quantity": 10 },
	  { "name": "forged permit", "quantity": 1 }
	],
	"map_position": [2, 7]
}

# Summarized Past Contexts
Gideon, the shadowy smuggler of Gearspring, thrives in the gray areas of trade. He operates behind the scenes, meeting contacts in hidden alleys and striking deals for rare mechanical components. His latest transaction involved selling a contraband coil to a mysterious buyer, securing a hefty gold coin payment in return.

Always on the move, Gideon is known for checking on hidden stashes and ensuring his business remains discreet. His whispering negotiations and well-timed trades keep the underground economy of Gearspring alive. He recently provided a tinkerer with a small gear set, proving that while his business may be shady, his connections make him indispensable to the village.

# Current Context
[
  {
    "action": "move",
    "parameters": { "x": 40, "y": 20 },
    "reasoning": "I need to meet a contact in the alley behind the marketplace."
  },
  {
    "action": "talk",
    "parameters": {
      "text": "I can get you what you need... for the right price."
    },
    "reasoning": "I'm negotiating a deal with a customer looking for rare mechanical parts."
  },
  {
    "action": "take",
    "parameters": {
      "artifact": "contraband coil"
    },
    "reasoning": "This rare coil was left unattended, and I know someone who will pay well for it."
  },
  {
    "action": "give",
    "parameters": {
      "artifact": "contraband coil",
      "toId": "npc2"
    },
    "reasoning": "They paid a good price for this rare mechanical component."
  },
  {
    "action": "move",
    "parameters": { "x": 55, "y": 35 },
    "reasoning": "I’m heading to a hidden stash to check on my supplies."
  },
  {
    "action": "talk",
    "parameters": {
      "text": "Keep it quiet, and we’ll both profit."
    },
    "reasoning": "I need to ensure my business remains discreet."
  },
  {
    "action": "take",
    "parameters": {
      "artifact": "gold coin"
    },
    "reasoning": "The last deal was a success, and I collected my payment."
  },
  {
    "action": "give",
    "parameters": {
      "artifact": "small gear set",
      "toId": "npc4"
    },
    "reasoning": "A tinkerer needed specialized gears, and I had them in stock."
  }
]
