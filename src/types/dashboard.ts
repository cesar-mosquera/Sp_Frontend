export interface LogMsg {
  app: string;
  icon: string;
  iconClass: string;
  msg: string;
  contact: string;
  contactShort: string;
  type: string;
  direction: string;
  duration: string;
  timeOffset: number;
}

export interface BackendLog {
  type?: string;
  content?: string;
  timestamp?: string;
  phone?: string;
  device_id?: string;
  id?: string;
  app?: string;
  platform?: string;
  source?: string;
  appKey?: string;
  service?: string;
  msg?: string;
  message?: string;
  sender?: string;
  contact?: string;
  time?: string;
}

export interface DeviceInfo {
  name: string;
  last_seen: string;
  count: number;
}
