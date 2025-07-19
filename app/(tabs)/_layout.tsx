import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#667eea',
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'home',
        }}
      />
    </Tabs>
  );
}