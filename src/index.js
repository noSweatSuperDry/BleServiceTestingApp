import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DeviceList from './components/DeviceList';
import Session from './components/Session';
const Stack = createNativeStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
            <Stack.Navigator>
                <Stack.Screen
                    name="Device List"
                    component={DeviceList}
                />
                <Stack.Screen
                    name="Session"
                    component={Session}
                />
            </Stack.Navigator>
        </NavigationContainer>
  );
}

export default App;