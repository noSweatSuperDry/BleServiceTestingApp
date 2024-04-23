import { View, Text, StyleSheet , Dimensions} from 'react-native'
import React from 'react'

export default function Footer() {
  return (
    <View style={styles.footerContainer}>
      <Text>Ecoaims Oy</Text>
      <Text>Version 1.0.0</Text>
    </View>
  )
}
const styles = StyleSheet.create({
    footerContainer: {
        backgroundColor: 'lightgray',
        padding: 20,
        alignItems: 'center',
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height * 0.1,
    },
    })
