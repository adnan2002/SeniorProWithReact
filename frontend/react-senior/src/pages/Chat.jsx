import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaChevronRight } from 'react-icons/fa';
import createAuthenticatedApi from '../utils/api';
import AuthContext from '../contexts/AuthContext';
import { toast } from 'react-toastify';

const Chat = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [api, setApi] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);

  const location = useLocation();
  const { courseId } = location.state || {};
  const messagesEndRef = useRef(null);
  const chatHistoryRef = useRef(null);
  const { getSession, user } = useContext(AuthContext);

  useEffect(() => {
    const initApi = async () => {
      const authenticatedApi = await createAuthenticatedApi(getSession);
      setApi(authenticatedApi);
    };
    initApi();
  }, [getSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (api && courseId) {
      startChat();
      fetchChatHistory();
    }
  }, [api, courseId]);

  useEffect(() => {
    const handleScroll = () => {
      const chatHistoryElement = chatHistoryRef.current;
      if (chatHistoryElement) {
        const isScrolledToBottom = 
          chatHistoryElement.scrollHeight - chatHistoryElement.clientHeight <= chatHistoryElement.scrollTop + 1;
        chatHistoryElement.style.boxShadow = isScrolledToBottom ? 'none' : 'inset 0 -10px 10px -10px rgba(0,0,0,0.5)';
      }
    };

    const chatHistoryElement = chatHistoryRef.current;
    if (chatHistoryElement) {
      chatHistoryElement.addEventListener('scroll', handleScroll);
      handleScroll();
    }

    return () => chatHistoryElement?.removeEventListener('scroll', handleScroll);
  }, [isSidebarOpen]);

  const fetchChatHistory = async () => {
    if (!api || !courseId) return;
    try {
      const response = await api.get(`/get_chat_history?course_id=${courseId}`);
      setChatHistory(response.data);
    } catch (error) {
      console.error('Error fetching chat history:', error);
      toast.error('Failed to fetch chat history. Please try again.');
    }
  };

  const startChat = async () => {
    if (!api || !courseId) return;
    try {
      const response = await api.post('/start_chat', { course_id: courseId });
      if (response.data.error) {
        toast.error(response.data.error);
      } else {
        setMessages([]);
        setMessageCount(0);
        setSelectedChat(null);
        fetchChatHistory();
      }
    } catch (error) {
      console.error('Error starting new chat session:', error);
      toast.error('Failed to start new chat session. Please try again.');
    }
  };

  const saveCurrentChat = async () => {
    if (!api) return;
    try {
      const response = await api.post('/save_chat');
      if (response.data.error) {
        toast.error(response.data.error);
      } else {
        toast.success('Chat saved successfully!');
        fetchChatHistory();
      }
    } catch (error) {
      console.error('Error saving chat:', error);
      toast.error('Failed to save chat. Please try again.');
    }
  };

  const loadChat = async (chatId) => {
    if (!api || !chatId) return;
    try {
      const response = await api.get(`/load_chat?chat_id=${chatId}`);
      setMessages(response.data.messages.map(msg => ({
        type: msg.type === 'HumanMessage' ? 'user' : 'bot',
        content: msg.content
      })));
      setMessageCount(response.data.messageCount);
      setSelectedChat(chatId);
    } catch (error) {
      console.error('Error loading chat:', error);
      toast.error('Failed to load chat. Please try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || !api) return;

    setIsLoading(true);
    setMessages(prev => [...prev, { type: 'user', content: input }]);
    setInput('');

    try {
      const response = await api.post('/query', { query: input });
      setMessages(prev => [...prev, { type: 'bot', content: response.data.answer }]);
      setMessageCount(response.data.messageCount);

      if (response.data.memoryFull) {
        toast.warning('Memory limit reached. Please clear the conversation to continue.');
      }
    } catch (error) {
      console.error('Error querying:', error);
      setMessages(prev => [...prev, { type: 'bot', content: 'Sorry, an error occurred. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyEntireChat = useCallback(() => {
    const chatText = messages.map(message => 
      `${message.type === 'user' ? 'User' : 'Bot'}: ${message.content}`
    ).join('\n\n');
    
    navigator.clipboard.writeText(chatText)
      .then(() => toast.success('Chat copied to clipboard!'))
      .catch(err => console.error('Failed to copy chat: ', err));
  }, [messages]);

  const formatMessage = useCallback((content, isBot) => {
    content = content.replace(/\*{2}(.*?)\*{2}/g, '<strong>$1</strong>');
  
    const codeBlocks = content.split('```');
    return codeBlocks.map((block, index) => {
      if (index % 2 === 1) {
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
        return <span key={index} dangerouslySetInnerHTML={{ __html: block }} />;
      }
    });
  }, []);

  const copyText = useCallback((text) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success('Copied to clipboard!'))
      .catch(err => console.error('Failed to copy: ', err));
  }, []);

  if (!courseId) return <div>Error: No course selected</div>;

  return (
    <div className="min-h-screen bg-primary p-0 flex flex-row">
      <div className='relative'>
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-64 bg-gray-800 text-white p-4 rounded-lg flex flex-col h-screen"
            >
              <h2 className="text-xl font-bold mb-4">Chat History</h2>
              <div 
                ref={chatHistoryRef} 
                className="overflow-y-auto flex-grow"
                style={{ 
                  scrollbarWidth: 'thin', 
                  scrollbarColor: '#4B5563 #1F2937',
                  maxHeight: 'calc(100vh - 120px)'
                }}
              >
                {chatHistory.length > 0 ? (
                  chatHistory.map((chat) => (
                    <div
                      key={chat.chatId}
                      className={`p-2 mb-2 bg-gray-700 rounded-lg cursor-pointer transition-colors duration-200 hover:bg-gray-600 ${
                        selectedChat === chat.chatId ? 'border-2 border-blue-500' : ''
                      }`}
                      onClick={() => loadChat(chat.chatId)}
                    >
                      {chat.Title}
                    </div>
                  ))
                ) : (
                  <p>No chat history yet.</p>
                )}
              </div>
              {user && (
                <div className="mt-4 overflow-hidden cursor-pointer">
                  <p 
                    className="font-light text-white truncate text-sm p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors duration-200" 
                    title={user?.signInDetails?.loginId}
                  >
                    {user?.signInDetails?.loginId}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          animate={{ rotate: isSidebarOpen ? 180 : 0, transitionDuration:   '0s' }}
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`absolute top-1/2 transform -translate-y-1/2 bg-secondary text-white p-2 rounded-r-lg z-10 transition-transform duration-300 ${isSidebarOpen ? 'right-0' : 'left-0'}`}
        >
          <FaChevronRight/>
        </motion.button>
      </div>

      <div className={`flex-grow transition-all duration-300 p-4 ${isSidebarOpen ? 'ml-3' : 'ml-7'}`}>
        <h1 className="text-2xl font-pbold text-secondary mb-4">Chat for {courseId}</h1>
        <div className="flex justify-between items-center mb-4">
          <span className="text-white">Message Count: {messageCount}/30</span>
          <div>
            <button onClick={copyEntireChat} className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 mr-2">
              Copy Entire Chat
            </button>
            <button onClick={startChat} className="bg-red-500 text-white p-2 rounded hover:bg-red-600 mr-2">
              Clear Conversation
            </button>
            <button onClick={saveCurrentChat} className="bg-green-500 text-white p-2 rounded hover:bg-green-600">
              Save Chat
            </button>
          </div>
        </div>
        <div className="bg-black-100 p-4 rounded-lg mb-4 h-96 overflow-y-auto">
          {messages.map((message, index) => (
            <div key={index} className={`mb-4 ${message.type === 'user' ? 'text-right' : 'text-left'}`}>
              <div className={`inline-block p-3 rounded-lg relative group ${
                message.type === 'user' ? 'bg-secondary text-white' : 'bg-gray-700 text-white'
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
    </div>
  );
};

export default Chat;