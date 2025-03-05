extends CanvasLayer
class_name ChatComponent
@onready var rich_text_label: RichTextLabel = $Control/RichTextLabel


func add_response_to_chat(response:String, npc_id = 1):
	
	var message = "%d says: %s\n" % [ npc_id, response ]
	rich_text_label.append_text(message)
