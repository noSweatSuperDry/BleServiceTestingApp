import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  NativeModules,
  NativeEventEmitter,
  Platform,
  PermissionsAndroid,
  FlatList,
  TouchableHighlight,
  Pressable,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors } from 'react-native/Libraries/NewAppScreen';
import BleManager, {
  BleScanCallbackType,
  BleScanMatchMode,
  BleScanMode,
} from 'react-native-ble-manager';
import PermissionManager from './components/PermissionManager';
import { CONSTANTS } from '../../constants';

const SECONDS_TO_SCAN_FOR = 3;
const SERVICE_UUIDS = [CONSTANTS.UUID.SERVICE];
const ALLOW_DUPLICATES = true;

const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

function DeviceList() {
    const navigation = useNavigation();

    const [isScanning, setIsScanning] = useState(false);
    const [peripherals, setPeripherals] = useState(new Map());
  
    const startScan = () => {
      if (!isScanning) {
        setPeripherals(new Map());
        setIsScanning(true);
        BleManager.scan(SERVICE_UUIDS, SECONDS_TO_SCAN_FOR, ALLOW_DUPLICATES, {
          matchMode: BleScanMatchMode.Sticky,
          scanMode: BleScanMode.LowLatency,
          callbackType: BleScanCallbackType.AllMatches,
        })
          .then(() => {})
          .catch((err) => {});
      }
    };
  
    const handleStopScan = () => {
      BleManager.stopScan();
      setIsScanning(false);
    };
  
    const handleDisconnectedPeripheral = (event) => {
      setPeripherals((map) => {
        let p = map.get(event.peripheral);
        if (p) {
          p.connected = false;
          return new Map(map.set(event.peripheral, p));
        }
        return map;
      });
    };
  
    const handleConnectPeripheral = (event) => {
      console.log(`[${event.peripheral}] connected.`);
    };
  
    const handleUpdateValueForCharacteristic = (data) => {
      console.debug(
        `[handleUpdateValueForCharacteristic] received data from '${data.peripheral}' with characteristic='${data.characteristic}' and value='${data.value}'`,
      );
    };
  
    const handleDiscoverPeripheral = (peripheral) => {
      if (!peripheral.name) {
        peripheral.name = 'NO NAME';
      }
      setPeripherals((map) => {
        return new Map(map.set(peripheral.id, peripheral));
      });
    };
  
    const togglePeripheralConnection = async (peripheral) => {
      if (peripheral && peripheral.connected) {
        try {
          await BleManager.disconnect(peripheral.id);
        } catch (error) {
          console.error(`[${peripheral.id}] error when trying to disconnect device.`);
        }
      } else {
        await connectPeripheral(peripheral);
      }
    };
  
    const retrieveConnected = async () => {
      try {
        const connectedPeripherals = await BleManager.getConnectedPeripherals();
        if (connectedPeripherals.length === 0) {
          console.warn('No connected peripherals found.');
          return;
        }
  
        for (var i = 0; i < connectedPeripherals.length; i++) {
          var peripheral = connectedPeripherals[i];
          setPeripherals((map) => {
            let p = map.get(peripheral.id);
            if (p) {
              p.connected = true;
              return new Map(map.set(p.id, p));
            }
            return map;
          });
        }
      } catch (error) {
        console.error('unable to retrieve connected peripherals.');
      }
    };
  
    const connectPeripheral = async (peripheral) => {
      try {
        if (peripheral) {
          setPeripherals((map) => {
            let p = map.get(peripheral.id);
            if (p) {
              p.connecting = true;
              return new Map(map.set(p.id, p));
            }
            return map;
          });
  
          await BleManager.connect(peripheral.id);
  
          setPeripherals((map) => {
            let p = map.get(peripheral.id);
            if (p) {
              p.connecting = false;
              p.connected = true;
              return new Map(map.set(p.id, p));
            }
            return map;
          });
  
          await sleep(900);
  
          const peripheralData = await BleManager.retrieveServices(peripheral.id);
  
          setPeripherals((map) => {
            let p = map.get(peripheral.id);
            if (p) {
              return new Map(map.set(p.id, p));
            }
            return map;
          });
  
          const rssi = await BleManager.readRSSI(peripheral.id);
  
          if (peripheralData.characteristics) {
            for (let characteristic of peripheralData.characteristics) {
              if (characteristic.descriptors) {
                for (let descriptor of characteristic.descriptors) {
                  try {
                    let data = await BleManager.readDescriptor(
                      peripheral.id,
                      characteristic.service,
                      characteristic.characteristic,
                      descriptor.uuid,
                    );
                  } catch (error) {
                    console.error(
                      `[${peripheral.id}] failed to retrieve descriptor ${descriptor} for characteristic ${characteristic}:`,
                      error,
                    );
                  }
                }
              }
            }
          }
  
          setPeripherals((map) => {
            let p = map.get(peripheral.id);
            if (p) {
              p.rssi = rssi;
              return new Map(map.set(p.id, p));
            }
            return map;
          });
  
          navigation.navigate('Session', {peripheralData: peripheralData});
        }
      } catch (error) {
        console.error(`[${peripheral.id}] connectPeripheral error`, error);
      }
    };
  
    function sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
  
    useEffect(() => {
      PermissionManager();
      try {
        BleManager.start({showAlert: false})
          .then(() => console.debug('BleManager started.'))
          .catch((error) => console.error('BeManager could not be started.', error));
      } catch (error) {
        console.error('unexpected error starting BleManager.', error);
        return;
      }
  
      const listeners = [
        bleManagerEmitter.addListener(
          'BleManagerDiscoverPeripheral',
          handleDiscoverPeripheral,
        ),
        bleManagerEmitter.addListener('BleManagerStopScan', handleStopScan),
        bleManagerEmitter.addListener(
          'BleManagerDisconnectPeripheral',
          handleDisconnectedPeripheral,
        ),
        bleManagerEmitter.addListener(
          'BleManagerDidUpdateValueForCharacteristic',
          handleUpdateValueForCharacteristic,
        ),
        bleManagerEmitter.addListener(
          'BleManagerConnectPeripheral',
          handleConnectPeripheral,
        ),
      ];
  
      return () => {
        for (const listener of listeners) {
          listener.remove();
        }
      };
    }, []);
  

  const renderItem = ({ item }) => {
    const backgroundColor = item.connected ? '#069400' : Colors.white;
    return (
      <TouchableHighlight
        onPress={() => togglePeripheralConnection(item)}>
        <View style={styles.itemSeparator}>
          <Text style={styles.itemSeparatorText}>
            {item.name} - {item?.advertising?.localName}
            {item.connecting && ' - Connecting...'}
          </Text>
          <Text style={styles.small10}>RSSI: {item.rssi}</Text>
          <Text style={styles.small10}>{item.id}</Text>
        </View>
      </TouchableHighlight>
    );
  };

  const handleAndroidPermissions = () => {
    if (Platform.OS === 'android' && Platform.Version >= 34) {
      PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]).then(result => {
        if (result) {
          console.debug(
            '[handleAndroidPermissions] User accepts runtime permissions android 12+',
          );
        } else {
          console.error(
            '[handleAndroidPermissions] User refuses runtime permissions android 12+',
          );
        }
      });
    } else if (Platform.OS === 'android' && Platform.Version >= 23) {
      PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ).then(checkResult => {
        if (checkResult) {
          console.debug(
            '[handleAndroidPermissions] runtime permission Android <12 already OK',
          );
        } else {
          PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ).then(requestResult => {
            if (requestResult) {
              console.debug(
                '[handleAndroidPermissions] User accepts runtime permission android <12',
              );
            } else {
              console.error(
                '[handleAndroidPermissions] User refuses runtime permission android <12',
              );
            }
          });
        }
      });
    }
  };

  return (
    <SafeAreaView>
    <View style={styles.container}>
      <View style={styles.subContainer}>
        <TouchableOpacity style={styles.searchButton} onPress={startScan}>
          <Text style={styles.buttonText}>Search for nearby devices</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.deviceContainer}>
        <FlatList
          data={Array.from(peripherals.values())}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={true}
        />
      </View>
      {isScanning ? <View style={styles.subContainer}>
        <TouchableOpacity style={styles.searchButton} onPress={handleStopScan}>
          <Text style={styles.buttonText}>Stop Scanning</Text>
        </TouchableOpacity>
      </View> : <></>}  
    </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    margin:10,
  },
  searchButton: {
    backgroundColor: 'blue',
    padding: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
  },
    subContainer: {
        margin: 20,
        height: Dimensions.get('window').height*.1,
    },
    deviceContainer: {
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height*.6,
        backgroundColor: 'lightgrey',
        borderRadius: 5,
        margin: 10,
    },
    itemSeparatorContainer: {
        padding: 1,
    },
    itemSeparator: {
        padding: 10,
        borderBottomWidth: 0.1,
        backgroundColor: 'white',
        borderRadius: 5,
    },
    itemSeparatorText: {
        fontSize: 14,
        color: 'black',
    },
    small10: {
        fontSize: 10,
    },
});

export default DeviceList;
