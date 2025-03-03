export default `
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
		"text": "Hi! How are you doing!"
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
		"toNPCId": "npc1"
	},
	"reasoning": "I want to buy his nifty hat"
}
`