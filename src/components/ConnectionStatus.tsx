type ConnectionState='connecting'|'connected'|'reconnecting'|'disconnected'
const labels:Record<ConnectionState,string>={connecting:'Đang kết nối',connected:'Đang đồng bộ',reconnecting:'Đang kết nối lại',disconnected:'Mất kết nối'}
export function ConnectionStatus({state}:{state:ConnectionState}){
  return <span className={`connection-pill ${state}`} role="status"><i />{labels[state]}</span>
}
