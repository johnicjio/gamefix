
import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Minimize2, User } from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatProps {
    messages: ChatMessage[];
    onSendMessage: (text: string) => void;
    myId: string;
    isOpen?: boolean;
}

export const Chat: React.FC<ChatProps> = ({ messages, onSendMessage, myId }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const lastMsgCount = useRef(messages.length);

    useEffect(() => {
        if (messages.length > lastMsgCount.current) {
            if (!isOpen) {
                setUnreadCount(prev => prev + (messages.length - lastMsgCount.current));
            } else {
                scrollToBottom();
            }
        }
        lastMsgCount.current = messages.length;
    }, [messages, isOpen]);

    useEffect(() => {
        if (isOpen) {
            setUnreadCount(0);
            scrollToBottom();
        }
    }, [isOpen]);

    const scrollToBottom = () => {
        requestAnimationFrame(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        });
    };

    const handleSend = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (inputText.trim()) {
            onSendMessage(inputText.trim());
            setInputText('');
        }
    };

    return (
        <>
            {/* Toggle Button */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-4 right-4 z-[60] p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center border-2 border-white/10
                    ${isOpen ? 'bg-gray-800 text-gray-400 rotate-90' : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white animate-bounce-subtle'}
                `}
            >
                {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
                {!isOpen && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-gray-900 shadow-lg animate-pulse">
                        {unreadCount > 9 ? '!' : unreadCount}
                    </span>
                )}
            </button>

            {/* Chat Window */}
            <div className={`fixed bottom-24 right-4 w-[90vw] sm:w-96 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-[60] flex flex-col transition-all duration-300 origin-bottom-right overflow-hidden
                ${isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-75 opacity-0 translate-y-10 pointer-events-none'}
            `} style={{ maxHeight: 'min(500px, 80vh)', height: '500px' }}>
                
                {/* Header */}
                <div className="bg-gray-100 dark:bg-gray-800 p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center select-none">
                    <h3 className="font-black text-gray-800 dark:text-white flex items-center gap-2 text-sm uppercase tracking-wide">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        Live Chat
                    </h3>
                    <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
                        <Minimize2 size={16}/>
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-black/40 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 text-xs gap-2 opacity-50">
                            <MessageSquare size={32} />
                            <p>No messages yet.<br/>Start the conversation!</p>
                        </div>
                    ) : (
                        messages.map((msg) => {
                            const isMe = msg.senderId === myId;
                            const isSystem = msg.isSystem;
                            
                            if (isSystem) {
                                return (
                                    <div key={msg.id} className="flex justify-center my-2">
                                        <span className="text-[10px] bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-3 py-1 rounded-full font-medium tracking-wide">
                                            {msg.text}
                                        </span>
                                    </div>
                                );
                            }

                            return (
                                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                                    <div className="flex items-center gap-1 mb-1 px-1">
                                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                                            {isMe ? 'You' : msg.senderName}
                                        </span>
                                    </div>
                                    <div className={`px-4 py-2 rounded-2xl max-w-[85%] text-sm break-words shadow-sm relative
                                        ${isMe 
                                            ? 'bg-indigo-600 text-white rounded-br-sm' 
                                            : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm border border-gray-200 dark:border-gray-700'}
                                    `}>
                                        {msg.text}
                                    </div>
                                    <span className="text-[9px] text-gray-400 mt-1 opacity-60 px-1">
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <form onSubmit={handleSend} className="p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex gap-2">
                    <input 
                        type="text" 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all border border-transparent focus:border-indigo-500 placeholder-gray-500 font-medium"
                    />
                    <button 
                        type="submit" 
                        disabled={!inputText.trim()}
                        className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
                    >
                        <Send size={18}/>
                    </button>
                </form>
            </div>
        </>
    );
};
