import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, SafeAreaView, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Simplified mobile version of ChatView
const ChatViewMobile = () => {
  const [messages, setMessages] = useState([
    { id: '1', role: 'model', text: 'Hello! I\'m Novel Weaver AI. How can I help you with your novel today?' },
    { id: '2', role: 'user', text: 'I\'d like to start a new fantasy novel.' },
    { id: '3', role: 'model', text: 'Great! Let\'s begin. What\'s the basic premise of your fantasy novel?' },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    // Add user message
    const userMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text: inputText,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText('');
    setIsLoading(true);

    // Save to AsyncStorage
    try {
      await AsyncStorage.setItem('novel-weaver-messages', JSON.stringify(newMessages));
    } catch (error) {
      console.error('Failed to save messages:', error);
    }

    // Simulate AI response (in a real app, this would call the AI service)
    setTimeout(() => {
      const aiMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'model',
        text: `I understand you're working on a fantasy novel. That's exciting! To help you better, I'd like to know more about your story. What are the main characters like, and what challenges will they face?`,
      };

      const updatedMessages = [...newMessages, aiMessage];
      setMessages(updatedMessages);
      setIsLoading(false);

      // Save to AsyncStorage
      try {
        AsyncStorage.setItem('novel-weaver-messages', JSON.stringify(updatedMessages));
      } catch (error) {
        console.error('Failed to save messages:', error);
      }
    }, 1500);
  };

  const renderMessage = ({ item }: { item: any }) => (
    <View style={[styles.messageContainer, item.role === 'user' ? styles.userMessage : styles.modelMessage]}>
      <Text style={styles.messageText}>{item.text}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Novel Weaver AI</Text>
      </View>
      
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContainer}
      />
      
      <View style={styles.inputContainer}>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type your message here..."
          style={styles.textInput}
          multiline
          editable={!isLoading}
        />
        <TouchableOpacity 
          onPress={handleSendMessage} 
          style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
          disabled={isLoading}
        >
          <Text style={styles.sendButtonText}>
            {isLoading ? 'Sending...' : 'Send'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    backgroundColor: '#2d2d2d',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    padding: 16,
  },
  messageContainer: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  userMessage: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  modelMessage: {
    backgroundColor: '#2d2d2d',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    color: '#fff',
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#2d2d2d',
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#444',
    color: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#555',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default ChatViewMobile;