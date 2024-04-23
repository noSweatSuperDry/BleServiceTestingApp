import React, {useState, useEffect} from 'react';
import {
  NativeModules,
  NativeEventEmitter,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import BleManager, {
  BleScanCallbackType,
  BleScanMatchMode,
  BleScanMode,
} from 'react-native-ble-manager';
import {CONSTANTS} from '../../../../constants';
import PermissionManager from '../PermissionManager';

const SECONDS_TO_SCAN_FOR = 3;
const SERVICE_UUIDS = [CONSTANTS.UUID.SERVICE];
const ALLOW_DUPLICATES = true;

const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

function BLEFunctions() {
  const navigation = useNavigation();

  const [isScanning, setIsScanning] = useState(false);
  const [peripherals, setPeripherals] = useState(new Map());
  const [data, setData] = useState('');

  // All the BLE related functions go here...
  // startScan, handleDisconnectedPeripheral, handleStopScan, handleConnectPeripheral, handleUpdateValueForCharacteristic, handleDiscoverPeripheral, togglePeripheralConnection, retrieveConnected, connectPeripheral, sleep

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
        .catch(err => {});
    }
  };

  console.log(data);

  const handleDisconnectedPeripheral = event => {
    setPeripherals(map => {
      let p = map.get(event.peripheral);
      if (p) {
        p.connected = false;
        return new Map(map.set(event.peripheral, p));
      }
      return map;
    });
  };

  const handleStopScan = () => {
    BleManager.stopScan();
    setIsScanning(false);
  };
  const handleConnectPeripheral = event => {
    console.log(`[${event.peripheral}] connected.`);
  };

  const handleUpdateValueForCharacteristic = data => {
    console.log(JSON.stringify(data));
    console.debug(
      `[handleUpdateValueForCharacteristic] received data from '${data.peripheral}' with characteristic='${data.characteristic}' and value='${data.value}'`,
    );
  };

  const handleDiscoverPeripheral = peripheral => {
    if (!peripheral.name) {
      peripheral.name = 'NO NAME';
    }
    setPeripherals(map => {
      return new Map(map.set(peripheral.id, peripheral));
    });
  };

  const togglePeripheralConnection = async peripheral => {
    if (peripheral && peripheral.connected) {
      try {
        await BleManager.disconnect(peripheral.id);
      } catch (error) {
        console.error(
          `[${peripheral.id}] error when trying to disconnect device.`,
        );
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
        setPeripherals(map => {
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

  const connectPeripheral = async peripheral => {
    try {
      if (peripheral) {
        setPeripherals(map => {
          let p = map.get(peripheral.id);
          if (p) {
            p.connecting = true;
            return new Map(map.set(p.id, p));
          }
          return map;
        });

        await BleManager.connect(peripheral.id);

        setPeripherals(map => {
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

        setPeripherals(map => {
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

        setPeripherals(map => {
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
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  useEffect(() => {
    PermissionManager();
    try {
      BleManager.start({showAlert: false})
        .then(() => console.debug('BleManager started.'))
        .catch(error =>
          console.error('BeManager could not be started.', error),
        );
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
}
export default BLEFunctions({isScanning, peripherals, data, startScan, togglePeripheralConnection});
