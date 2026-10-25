export type AdminNightPassDeviceRow = {
  id: string;
  name: string;
  connectedCount: number;
  maxDevices: number;
};

export type AdminNightPassDevicesResponse = {
  enabled: boolean;
  maxDevices: number;
  totalConnected: number;
  housesWithDevices: number;
  houses: AdminNightPassDeviceRow[];
};
