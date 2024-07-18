import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import createAuthenticatedApi from '../utils/api';
import AuthContext from '../contexts/AuthContext';

const Chat = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const location = useLocation();
  const { courseId } = location.state || {}; // Add fallback for courseId
  const messagesEndRef = useRef(null);
  const { getSession } = useContext(AuthContext);
  const [api, setApi] = useState(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    const initApi =  () => {
      const authenticatedApi =  createAuthenticatedApi(getSession);
      setApi(authenticatedApi);
    };
    initApi();
  }, [getSession]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const copyEntireChat = useCallback(() => {
    const chatText = messages.map(message => 
      `${message.type === 'user' ? 'User' : 'Bot'}: ${message.content}`
    ).join('\n\n');
    
    navigator.clipboard.writeText(chatText).then(() => {
      alert('Chat copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy chat: ', err);
    });
  }, [messages]);

  const formatMessage = useCallback((content, isBot) => {
    // Bold text wrapped in *****
    content = content.replace(/\*{2}(.*?)\*{2}/g, '<strong>$1</strong>');
  
    // Handle code blocks
    const codeBlocks = content.split('```');
    const formattedContent = codeBlocks.map((block, index) => {
      if (index % 2 === 1) {
        // This is a code block
        return (
          <div key={index} className="relative group">
            <pre className="bg-gray-800 text-green-400 p-4 rounded-md my-2 overflow-x-auto">
              <code>{block.trim()}</code>
            </pre>
            {isBot && (
              <button
                onClick={() => copyText(block.trim())}
                className="absolute top-2 right-2 bg-gray-700 text-white px-2 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Copy Code
              </button>
            )}
          </div>
        );
      } else {
        return (
          <span key={index} dangerouslySetInnerHTML={{ __html: block }} />
        );
      }
    });
  
    return formattedContent;
  }, []);

  
  const copyText = useCallback((text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || !api) return;

    setIsLoading(true);
    const userMessage = { type: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    try {
      const response = await api.post('/query', { query: input });
      const botMessage = { type: 'bot', content: response.data.answer };
      setMessages(prev => [...prev, botMessage]);
      setMessageCount(response.data.messageCount);

      if (response.data.memoryFull) {
        alert('Memory limit reached. Please clear the conversation to continue.');
      }
    } catch (error) {
      console.error('Error querying:', error);
      setMessages(prev => [...prev, { type: 'bot', content: 'Sorry, an error occurred. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearMemory = async () => {
    if (!api) return;

    try {
      await api.post('/clear_memory');
      setMessages([]);
      setMessageCount(0);
    } catch (error) {
      console.error('Error clearing memory:', error);
    }
  };

  if (!courseId) {
    return <div>Error: No course selected</div>;
  }

  return (
    <div className="min-h-screen bg-primary p-4">
      <h1 className="text-2xl font-pbold text-secondary mb-4">Chat for {courseId}</h1>
      <div className="flex justify-between items-center mb-4">
        <span className="text-white">Message Count: {messageCount}/30</span>
        <div>
          <button
            onClick={copyEntireChat}
            className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 mr-2"
          >
            Copy Entire Chat
          </button>
          <button
            onClick={handleClearMemory}
            className="bg-red-500 text-white p-2 rounded hover:bg-red-600"
          >
            Clear Conversation
          </button>
        </div>
      </div>
      <div className="bg-black-100 p-4 rounded-lg mb-4 h-96 overflow-y-auto">
        {messages.map((message, index) => (
          <div key={index} className={`mb-4 ${message.type === 'user' ? 'text-right' : 'text-left'}`}>
            <div className={`inline-block p-3 rounded-lg relative group ${
              message.type === 'user' 
                ? 'bg-secondary text-white' 
                : 'bg-gray-700 text-white'
            }`}>
              {formatMessage(message.content, message.type === 'bot')}
              {message.type === 'bot' && (
                <div className='flex flex-row items-center justify-end pt-5'>
                  <button
                    onClick={() => copyText(message.content)}
                    className="bg-gray-600 text-white px-2 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black-200"
                  >
                    Copy Message
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="flex">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-grow p-2 rounded-l bg-black-200 text-white"
          placeholder="Type your message..."
        />
        <button
          type="submit"
          disabled={isLoading || messageCount >= 30}
          className="bg-gradient-to-r from-button-from to-button-to text-white p-2 rounded-r"
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
};

export default Chat;