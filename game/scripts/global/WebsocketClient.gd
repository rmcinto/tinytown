extends Node
class_name WebSocketClient

@export var url: String = "ws://localhost:3000" # WebSocket server URL
var websocket: WebSocketPeer = WebSocketPeer.new()

signal message_received(message: Dictionary)
signal connected()
signal disconnected()

# To track the last connection state
var last_state: int = WebSocketPeer.STATE_CLOSED

func _ready() -> void:
	print("[WebSocketClient] _ready() called. Attempting to connect to server: ", url)
	connect_to_server(url)

func connect_to_server(url: String) -> void:
	var err = websocket.connect_to_url(url)
	if err != OK:
		push_error("[WebSocketClient] Error connecting to WebSocket server: %s" % err)
		return
	print("[WebSocketClient] Connection to server initiated.")

func _process(delta: float) -> void:
	websocket.poll()
	var state = websocket.get_ready_state()
	
	# Only print connection state when it changes
	if state != last_state:
		match state:
			WebSocketPeer.STATE_OPEN:
				print("[WebSocketClient] Connection state: OPEN")
				connected.emit()
			WebSocketPeer.STATE_CONNECTING:
				print("[WebSocketClient] Connection state: CONNECTING")
			WebSocketPeer.STATE_CLOSING:
				print("[WebSocketClient] Connection state: CLOSING")
			WebSocketPeer.STATE_CLOSED:
				var code = websocket.get_close_code()
				var reason = websocket.get_close_reason()
				print("[WebSocketClient] Connection state: CLOSED. Code: %d, Reason: %s" % [code, reason])
				disconnected.emit()
				set_process(false) # Stop processing when closed.
		
		last_state = state
	
	# Handle incoming messages when connected
	if state == WebSocketPeer.STATE_OPEN:
		while websocket.get_available_packet_count() > 0:
			var message = websocket.get_packet().get_string_from_utf8()
			_on_message_received(message)

func send_message(data: Dictionary) -> void:
	if websocket.get_ready_state() == WebSocketPeer.STATE_OPEN:
		var json_message = JSON.stringify(data)
		websocket.send_text(json_message)
		print("[WebSocketClient] Sent JSON message: ", json_message)
	else:
		push_warning("[WebSocketClient] WebSocket is not connected. Cannot send message.")

func _on_message_received(message: String) -> void:
	print("[WebSocketClient] Raw message received: ", message)
	var data = JSON.parse_string(message)
	if typeof(data) == TYPE_DICTIONARY:
		print("[WebSocketClient] Parsed JSON data: ", data)
		emit_signal("message_received", data)
	else:
		push_error("[WebSocketClient] Failed to parse JSON message: %s" % message)
