/* AUTO-GENERATED FILE. DO NOT EDIT. */

import { GenericList } from '../components/GenericList'
import { activityLogService } from '../services'

export default function ActivityLogList() {
  return (
    <GenericList
      module="activity-log"
      subject="ACTIVITY_LOG"
      actions={{
        onList: activityLogService.listMine,
        onRead: () => {},
        onCreate: () => {},
        onUpdate: () => {},
        onDelete: () => {},
      }}
    />
  )
}
