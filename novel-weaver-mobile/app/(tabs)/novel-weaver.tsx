import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NovelWeaverApp from '../novel-weaver';

export default function NovelWeaverTab() {
  return (
    <View style={styles.container}>
      <NovelWeaverApp />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});