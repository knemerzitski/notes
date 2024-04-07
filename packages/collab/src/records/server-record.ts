import { ClientRecord, followRecordSelection } from './client-record';
import { RevisionRecords } from './revision-records';

export interface ServerRecord extends Omit<ClientRecord, 'generatedId'> {
  clientId?: string;
}

export function createServerRecords<TRecord extends ServerRecord>() {
  const records = new RevisionRecords<TRecord>();
  records.filterBus.on('followRecord', followRecordSelection);
  return records;
}
