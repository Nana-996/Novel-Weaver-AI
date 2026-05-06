import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import ChatViewMobile from './ChatView.mobile';

// Main App component for mobile version
const AppMobile = () => {
  const [currentView, setCurrentView] = useState('chat');

  const renderCurrentView = () => {
    switch (currentView) {
      case 'chat':
        return <ChatViewMobile />;
      case 'manuscript':
        return (
          <View style={styles.centeredView}>
            <Text style={styles.viewTitle}>Manuscript View</Text>
            <Text style={styles.viewDescription}>
              This would show your complete manuscript with all chapters.
            </Text>
          </View>
        );
      case 'characters':
        return (
          <View style={styles.centeredView}>
            <Text style={styles.viewTitle}>Character Notes</Text>
            <Text style={styles.viewDescription}>
              This would show your character notes and allow you to edit them.
            </Text>
          </View>
        );
      case 'plot':
        return (
          <View style={styles.centeredView}>
            <Text style={styles.viewTitle}>Plot Notes</Text>
            <Text style={styles.viewDescription}>
              This would show your plot and world-building notes.
            </Text>
          </View>
        );
      default:
        return <ChatViewMobile />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Novel Weaver AI</Text>
        <Text style={styles.headerSubtitle}>Mobile Version</Text>
      </View>
      
      {renderCurrentView()}
      
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tabButton, currentView === 'chat' && styles.activeTab]}
          onPress={() => setCurrentView('chat')}
        >
          <Text style={[styles.tabText, currentView === 'chat' && styles.activeTabText]}>Chat</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabButton, currentView === 'manuscript' && styles.activeTab]}
          onPress={() => setCurrentView('manuscript')}
        >
          <Text style={[styles.tabText, currentView === 'manuscript' && styles.activeTabText]}>Manuscript</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabButton, currentView === 'characters' && styles.activeTab]}
          onPress={() => setCurrentView('characters')}
        >
          <Text style={[styles.tabText, currentView === 'characters' && styles.activeTabText]}>Characters</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabButton, currentView === 'plot' && styles.activeTab]}
          onPress={() => setCurrentView('plot')}
        >
          <Text style={[styles.tabText, currentView === 'plot' && styles.activeTabText]}>Plot</Text>
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
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 4,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  viewTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  viewDescription: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#2d2d2d',
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#fff',
  },
});

export default AppMobile;