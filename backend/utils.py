def serialize_messages(messages):
    serialized_messages = []
    for msg in messages:
        if isinstance(msg, dict):
            msg_type = msg['type']
            content = msg['content']
            additional_kwargs = msg.get('additional_kwargs', {})
        else:
            msg_type = msg.__class__.__name__
            content = msg.content
            additional_kwargs = getattr(msg, 'additional_kwargs', {})

        serialized_msg = {
            'M': {
                'type': {'S': msg_type},
                'content': {'S': content},
                'additional_kwargs': {'M': {}}
            }
        }
        for key, value in additional_kwargs.items():
            serialized_msg['M']['additional_kwargs']['M'][key] = {'S': str(value)}
        serialized_messages.append(serialized_msg)
    return serialized_messages
def deserialize_messages(serialized_messages):
    messages = []
    for msg in serialized_messages:
        if isinstance(msg, dict) and 'M' in msg:
            msg_data = msg['M']
            messages.append({
                'type': msg_data['type']['S'],
                'content': msg_data['content']['S'],
                'additional_kwargs': {k: v['S'] for k, v in msg_data['additional_kwargs']['M'].items()} if msg_data['additional_kwargs']['M'] else {}
            })
        else:
            # If the message is already in the desired format, just append it
            messages.append(msg)
    return messages
