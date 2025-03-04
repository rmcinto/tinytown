extends Node

# Signal to notify when data is received from the server
signal data_received(data: Dictionary)

# Reference the WebSocketClient autoload directly
@onready var websocket_client = WebsocketClient

@export var chat_component : ChatComponent

func read_markdown_file(file_path: String) -> String:
	var file = FileAccess.open(file_path, FileAccess.ModeFlags.READ)
	if file:
		var content = file.get_as_text()
		file.close()
		return content
	else:
		print("Failed to open file: " + file_path)
		return ""

func _ready():
	# Connect to the WebSocketClient's signals
	websocket_client.message_received.connect(_on_server_message)
	websocket_client.connected.connect(_on_connected)
	websocket_client.disconnected.connect(_on_disconnected)

# Function to send data to the server
func send_data(route: String, data):
	if websocket_client.websocket.get_ready_state() == WebSocketPeer.STATE_OPEN:
		var data_to_send = {"route": route, "payload": data}
		var message = JSON.stringify(data_to_send)
		websocket_client.websocket.put_packet(message.to_utf8_buffer())
		print("Sent message:", message)
	else:
		print("WebSocket is not connected. Cannot send data.")

# Handle server messages
func _on_server_message(message: Dictionary):
	if message.has("response"):
		chat_component.add_response_to_chat(message["response"])
	emit_signal("data_received", message)

func _on_connected():
	print("WebSocketComponent: Connected to server.")
	var prompt = read_markdown_file("res://assets/prompts/npc4_prompt.md")
	send_data("chat", prompt)

func _on_disconnected():
	print("WebSocketComponent: Disconnected from server.")
