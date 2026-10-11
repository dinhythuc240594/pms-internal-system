import React, { useCallback, useEffect, useRef, useState } from 'react';
import { availableRooms, today, addDays } from './model';
import { PmsContext } from './usePms';
import { FEATURES, routePolicy } from './access';
import { createApiClient, createRequestScope, createIntentJournal, permitted, subscriptionDecision, tenantRole, systemUser } from './api';
const browserIntentStorage = () => { try { return sessionStorage; } catch { return undefined; } };
const TENANT_KEY = 'bluejay-pms-active-tenant-v2';
const catalogs = ['roomTypes','bookingSources','services','serviceCategories','paymentMethods','funds','warehouses','items','itemCategories','suppliers','units','bedTypes','cashbookCategories','meals','commissionRules'];
const emptyState = () => ({ rooms: [], bookings: [], guests: [], receipts: [], posInvoices: [], cashDocuments: [], cashbookActors: [], housekeepingAccounts: [], housekeepingStaff: [], housekeepingShifts: [], housekeepingTasks: [], housekeepingWorkLogs: [], housekeepingLog: [], ledger: [], rates: [], roomBlocks: [], users: [], settings: { timezone:'Asia/Ho_Chi_Minh',currency:'VND',checkInTime:'14:00',checkOutTime:'12:00' }, masters:Object.fromEntries(catalogs.map(key=>[key,[]])) });
const unavailable = () => { throw new Error('Chức năng này chưa được triển khai. Dữ liệu chưa được lưu.'); };
const enc=encodeURIComponent;
export function PmsProvider({ children }) {
  const api = useRef(createApiClient()).current, scope = useRef(createRequestScope()).current, intents=useRef(createIntentJournal(browserIntentStorage())).current;
  const [session,setSession] = useState(null);
  const [authGeneration,setAuthGeneration] = useState(0);
  const [selectedId,setSelectedId] = useState(()=>{ try{return JSON.parse(localStorage.getItem(TENANT_KEY));}catch{return null;} });
  const [state,setState] = useState(emptyState), [loading,setLoading] = useState(true), [workspaceLoading,setWorkspaceLoading] = useState(false);
  const [loadError,setLoadError] = useState(''), [loadErrorStatus,setLoadErrorStatus] = useState(null), [accessDialog,setAccessDialog] = useState(null), [allTenants,setAllTenants] = useState([]), [auditLogs,setAuditLogs] = useState([]);
  const [adminLoadError,setAdminLoadError] = useState(null);
  const fetchVersion = useRef(0), authVersion = useRef(0);
  const user=session?.user||null, hotels=(session?.tenants||[]).filter(t=>tenantRole(user,t.id));
  const tenantId=hotels.some(t=>t.id===selectedId)?selectedId:hotels[0]?.id||null;
  const sessionTenantStatus=hotels.find(t=>t.id===tenantId)?.status;
  const tenant=state.tenant?.id===tenantId ? {...hotels.find(t=>t.id===tenantId),...state.tenant} : hotels.find(t=>t.id===tenantId), role=tenantRole(user,tenantId);
  const forgetSession=useCallback(()=>{ ++authVersion.current; setAuthGeneration(value=>value+1); api.setCsrf(null);scope.select(null);++fetchVersion.current;setSession(null);setState(emptyState());setAllTenants([]);setAuditLogs([]);setLoadError('');setLoadErrorStatus(null);setAdminLoadError(null);setAccessDialog(null); },[api,scope]);
  function acceptSession(next){
    ++authVersion.current; setAuthGeneration(value=>value+1); api.setCsrf(next.csrfToken);setSession(next);setAllTenants([]);setAuditLogs([]);setLoadError('');setLoadErrorStatus(null);setAdminLoadError(null);setAccessDialog(null);
    const chosen=next.tenants.find(t=>t.id===selectedId&&tenantRole(next.user,t.id))||next.tenants.find(t=>tenantRole(next.user,t.id));
    scope.select(chosen?.id||null);setSelectedId(chosen?.id||null);setState(emptyState());return next.user;
  }
  async function restoreSession(){let version=++authVersion.current;setLoading(true);try{const next=await api.request('/api/auth/session');if(version!==authVersion.current)return;acceptSession(next);version=authVersion.current;}catch(error){if(version!==authVersion.current)return;forgetSession();version=authVersion.current;if(error.status!==401){setLoadError(error.message);setLoadErrorStatus(error.status||503);}}finally{if(version===authVersion.current)setLoading(false);}}
  useEffect(()=>{restoreSession();},[]);
  const fail=useCallback(error=>{if(error.status===401)forgetSession();setAccessDialog({reason:error.status===403?'role':'error',message:error.message,status:error.status||503});throw error;},[forgetSession]);
  const refresh=useCallback(async(token=scope.current(),initial=false)=>{
    if(!token.tenantId||!scope.isCurrent(token))return;
    const version=++fetchVersion.current;if(initial)setWorkspaceLoading(true);
    try{
      const data=await api.request('/api/tenants/'+encodeURIComponent(token.tenantId)+'/workspace');
      if(!scope.isCurrent(token)||version!==fetchVersion.current)return;
      setState({...emptyState(),...data,settings:{...emptyState().settings,...data.settings},masters:{...emptyState().masters,...data.masters},housekeepingLog:data.housekeepingLogs||data.housekeepingLog||[]});setLoadError('');setLoadErrorStatus(null);
    }catch(error){if(scope.isCurrent(token)&&version===fetchVersion.current){setLoadError(error.message);setLoadErrorStatus(error.status||503);if(error.status===401)forgetSession();}throw error;}
    finally{if(scope.isCurrent(token)&&version===fetchVersion.current)setWorkspaceLoading(false);}
  },[api,scope,forgetSession]);
  useEffect(()=>{const token=scope.select(tenantId);setState(emptyState());setLoadError('');setLoadErrorStatus(null);if(user)refresh(token,true).catch(()=>{});},[tenantId,user?.id,sessionTenantStatus]);
  async function loadAdmin(){
    if(!systemUser(user))return;
    const version=authVersion.current;
    try{const result=await api.request('/api/tenants');if(version!==authVersion.current)return;setAllTenants(result.tenants||[]);if(user.globalRole==='SUPER_ADMIN'){const logs=await api.request('/api/audit');if(version===authVersion.current)setAuditLogs(logs.auditLogs||logs.logs||[]);}if(version===authVersion.current)setAdminLoadError(null);}
    catch(error){if(version===authVersion.current){if(error.status===401)forgetSession();else setAdminLoadError({message:error.message,status:error.status||503});}throw error;}
  }
  useEffect(()=>{loadAdmin().catch(()=>{});},[user?.id]);
  async function retryData(){if(!user)return restoreSession();if(scope.current().tenantId)await refresh();if(systemUser(user))await loadAdmin();}
  async function login(email,password,remember=false){let version=++authVersion.current;try{const next=await api.request('/api/auth/login',{method:'POST',body:{email,password,remember}});if(version!==authVersion.current)throw new Error('Phiên đăng nhập đã thay đổi.');const result=acceptSession(next);version=authVersion.current;return result;}finally{if(version===authVersion.current)setLoading(false);}}
  async function logout(){const version=++authVersion.current;try{await api.request('/api/auth/logout',{method:'POST',body:{}});if(version===authVersion.current)forgetSession();}catch(error){if(version===authVersion.current)return fail(error);throw error;}}
  function selectTenant(id){
    if(id===tenantId)return;
    if(!hotels.some(t=>t.id===id))return fail(new Error('Bạn không có quyền vào khách sạn này.'));
    scope.select(id);++fetchVersion.current;setState(emptyState());setWorkspaceLoading(true);setSelectedId(id);setAccessDialog(null);
    try{localStorage.setItem(TENANT_KEY,JSON.stringify(id));}catch{/* Selection remains in memory. */}
  }
  async function mutate(path,body,method='POST',intent){
    const token=scope.current();if(!token.tenantId)return fail(new Error('Chưa chọn khách sạn.'));
    let pendingIntent;
    try{const fullPath='/api/tenants/'+encodeURIComponent(token.tenantId)+path;if(intent)pendingIntent=await intents.acquire(fullPath,body,intent);const result=await api.request(fullPath,{method,body,intent:pendingIntent?.key});if(!scope.isCurrent(token))throw new Error('Khách sạn đã thay đổi. Vui lòng tải lại dữ liệu.');await refresh(token);if(!scope.isCurrent(token))throw new Error('Phiên thao tác đã thay đổi. Vui lòng tải lại dữ liệu.');if(pendingIntent)intents.confirm(pendingIntent);return result;}catch(error){if(scope.isCurrent(token))return fail(error);throw error;}
  }
  const requestTenant=useCallback(async(path,options)=>{const token=scope.current();try{if(!token.tenantId)throw new Error('Chưa chọn khách sạn.');const data=await api.request('/api/tenants/'+encodeURIComponent(token.tenantId)+path,options);if(!scope.isCurrent(token))throw new Error('Khách sạn đã thay đổi.');return data;}catch(error){if(scope.isCurrent(token)&&[401,403].includes(error.status))return fail(error);throw error;}},[api,scope,fail,tenantId,user?.id]);
  const access=(action,feature,write=!action.endsWith('.view'))=>{
    const result=permitted(user,tenant,action,write);
    return result.allowed ? subscriptionDecision(state.subscription,state.features,action,feature,write) : result;
  };
  function routeAccess(path){
    const policy=routePolicy(path);
    if(policy.manager){if(!user)return{allowed:false,reason:'session',message:'Vui lòng đăng nhập.'};return systemUser(user)&&(!policy.superOnly||user.globalRole==='SUPER_ADMIN')?{allowed:true}:{allowed:false,reason:'role',message:'Bạn không có quyền quản trị phần này (403).'};}
    return access(path.startsWith('/id/guests')?'guests.view':policy.action,policy.feature,false);
  }
  function allowAction(action){if(/^ota\./.test(action)){setAccessDialog({reason:'unavailable',message:'Chức năng này chưa được triển khai.'});return false;}const result=access(action,undefined,true);if(!result.allowed)setAccessDialog(result);return result.allowed;}
  async function runAction(action,feature,callback){if(!allowAction(action))return;try{await callback();}catch(error){setAccessDialog({reason:'error',message:error.message});}}
  const available=(start=today(state.settings.timezone),end=addDays(start,1),typeId='')=>availableRooms(state.rooms.filter(r=>r.active!==false && state.masters.roomTypes.some(t=>t.id===r.typeId&&t.active!==false)),state.bookings,start,end,typeId).filter(r => !state.roomBlocks.some(b => (b.room === r.id || b.roomId === r.uuid) && b.start < end && b.end > start) && !state.rates.some(rate => rate.roomTypeId === r.typeId && rate.date >= start && rate.date < end && rate.stopSell));
  const refreshIdentity=useCallback(async()=>{
    const version=++authVersion.current;
    try{const next=await api.request('/api/auth/session');if(version===authVersion.current){api.setCsrf(next.csrfToken);setSession(next);}}
    catch(error){if(version===authVersion.current)return fail(error);throw error;}
  },[api,fail]);
  async function saveTenant({id,...input}){const version=authVersion.current;try{const result=await api.request('/api/tenants'+(id?'/'+enc(id):''),{method:id?'PATCH':'POST',body:input});if(version!==authVersion.current)throw new Error('Phiên đăng nhập đã thay đổi.');setAllTenants(rows=>id?rows.map(row=>row.id===id?result:row):[...rows,result]);await refreshIdentity();return result;}catch(error){if(version===authVersion.current)return fail(error);throw error;}}
  const financial=(path,input,method='POST',intent)=>mutate(path,input,method,intent||crypto.randomUUID());
  const requestSystem=useCallback(async(path,options)=>{const version=authVersion.current;try{const result=await api.request(path,options);if(version!==authVersion.current)throw new Error('Phiên đăng nhập đã thay đổi.');return result;}catch(error){if(version===authVersion.current&&[401,403].includes(error.status))return fail(error);throw error;}},[api,fail]);
  const listSaasInvoices=useCallback(filters=>requestSystem('/api/billing/invoices?'+new URLSearchParams(Object.entries(filters||{}).filter(([,value])=>value!==''&&value!=null))),[requestSystem]);
  const postSaasMoney=useCallback(async(path,input,intent)=>{
    const version=authVersion.current;
    const pending=await intents.acquire(path,input,intent,user?.id);
    if(version!==authVersion.current)throw new Error('Phiên đăng nhập đã thay đổi.');
    const result=await requestSystem(path,{method:'POST',body:input,intent:pending.key});
    intents.confirm(pending);return result;
  },[requestSystem,intents,user?.id]);
  const createSaasInvoice=useCallback((input,intent)=>postSaasMoney('/api/billing/invoices',input,intent),[postSaasMoney]);
  const recordSaasPayment=useCallback((id,input,intent)=>postSaasMoney('/api/billing/invoices/'+enc(id)+'/payments',input,intent),[postSaasMoney]);
  const voidSaasInvoice=useCallback((id,reason)=>requestSystem('/api/billing/invoices/'+enc(id)+'/void',{method:'POST',body:{reason}}),[requestSystem]);
  const getManagerOverview=useCallback((start,end)=>requestSystem('/api/manager/overview?'+new URLSearchParams(Object.entries({start,end}).filter(([,value])=>value))),[requestSystem]);
  const getManagedTenantUsers=useCallback(id=>requestSystem('/api/tenants/'+enc(id)+'/users'),[requestSystem]);
  const saveManagedTenantUser=useCallback((tenantId,{id,...input})=>requestSystem('/api/tenants/'+enc(tenantId)+'/users'+(id?'/'+enc(id):''),{method:id?'PATCH':'POST',body:input}),[requestSystem]);
  const getCustomerHistory=useCallback((id,page=1)=>requestSystem('/api/tenants/'+enc(id)+'/customer-history?'+new URLSearchParams({page,pageSize:20})),[requestSystem]);
  const getOwnSessions=useCallback(()=>requestSystem('/api/auth/sessions'),[requestSystem]);
  const revokeOtherSessions=useCallback(()=>requestSystem('/api/auth/sessions/revoke-others',{method:'POST',body:{}}),[requestSystem]);
  const saveOwnProfile=useCallback(async name=>{const result=await requestSystem('/api/auth/profile',{method:'PATCH',body:{name}});setSession(previous=>previous?{...previous,user:result.user}:previous);return result;},[requestSystem]);
  const listPlans=useCallback(()=>requestSystem('/api/plans'),[requestSystem]);
  const listSystemUsers=useCallback(()=>requestSystem('/api/users'),[requestSystem]);
  const saveSystemUser=useCallback(async({id,...input})=>{const result=await requestSystem('/api/users'+(id?'/'+enc(id):''),{method:id?'PATCH':'POST',body:input});if(result.id===user?.id)await refreshIdentity().catch(()=>{});return result;},[requestSystem,refreshIdentity,user]);
  const getManagerFeatures=useCallback(()=>requestSystem('/api/features'),[requestSystem]);
  const setGlobalFeature=useCallback(async(code,enabledGlobal)=>{const result=await requestSystem('/api/features/'+enc(code),{method:'PATCH',body:{enabledGlobal}});if(scope.current().tenantId)await refresh().catch(()=>{});return result;},[requestSystem,scope,refresh]);
  const saveFeatureOverride=useCallback(async(id,code,input)=>{const result=await requestSystem('/api/tenants/'+enc(id)+'/feature-overrides/'+enc(code),{method:'PUT',body:input});if(scope.current().tenantId===id)await refresh().catch(()=>{});return result;},[requestSystem,scope,refresh]);
  const removeFeatureOverride=useCallback(async(id,code)=>{const result=await requestSystem('/api/tenants/'+enc(id)+'/feature-overrides/'+enc(code),{method:'DELETE'});if(scope.current().tenantId===id)await refresh().catch(()=>{});return result;},[requestSystem,scope,refresh]);
  const getTenantSubscription=useCallback(id=>requestSystem('/api/tenants/'+enc(id)+'/subscription'),[requestSystem]);
  const getSubscriptionHistory=useCallback(id=>requestSystem('/api/tenants/'+enc(id)+'/subscription/history'),[requestSystem]);
  const savePlan=useCallback(async({id,...input})=>{const result=await requestSystem('/api/plans'+(id?'/'+enc(id):''),{method:id?'PATCH':'POST',body:input});if(scope.current().tenantId)await refresh();return result;},[requestSystem,refresh,scope]);
  const saveTenantSubscription=useCallback(async(id,input)=>{const result=await requestSystem('/api/tenants/'+enc(id)+'/subscription',{method:'PUT',body:input});if(scope.current().tenantId===id)await refresh();return result;},[requestSystem,refresh,scope]);
  const getDashboardReport=useCallback(date=>requestTenant('/reports/dashboard?date='+enc(date)),[requestTenant]);
  const getRevenueReport=useCallback((start,end,currency,basis='original')=>requestTenant('/reports/revenue?'+new URLSearchParams({start,end,currency,basis})),[requestTenant]);
  const getFinancialReport=useCallback((start,end,currency,basis='original')=>requestTenant('/reports/financial?'+new URLSearchParams({start,end,currency,basis})),[requestTenant]);
  const features=Object.entries(state.features||{}).map(([code,enabled])=>({...FEATURES.find(item=>item.code===code),id:code,code,name:FEATURES.find(item=>item.code===code)?.name||code,enabledGlobal:enabled,allowed:enabled}));
  const value={
    ...state,...state.masters,loading,workspaceLoading,loadError:loadError||adminLoadError?.message||'',loadErrorStatus:loadError?loadErrorStatus:adminLoadError?.status||null,retry:retryData,tenant,tenantId,hotels,tenants:systemUser(user)?allTenants:hotels,user,role,isManager:systemUser(user),authGeneration,
    workspace:{tenants:allTenants.length?allTenants:hotels,users:state.users,auditLogs,features,tenantFeatureOverrides:{}},
    login,logout,selectTenant,access,routeAccess,allowAction,runAction,accessDialog,showAccess:setAccessDialog,closeAccess:()=>setAccessDialog(null),
    quota:state.quota||{rooms:{used:state.rooms.length,limit:null},users:{used:state.users.length,limit:null}},subscription:state.subscription||null,storageWarning:'',features,tenantFeatureOverrides:{},
    createBooking:input=>mutate('/reservations',input),updateBooking:(id,input)=>mutate('/reservations/'+enc(id),input,'PATCH'),
    changeStatus:(id,status)=>mutate('/reservations/'+enc(id)+'/status',{status}),
    cleanRoom:id=>mutate('/rooms/'+enc(id)+'/condition',{condition:'clean'}),dirtyRoom:id=>mutate('/rooms/'+enc(id)+'/condition',{condition:'dirty'}),setCondition:(id,condition)=>mutate('/rooms/'+enc(id)+'/condition',{condition}),
    saveMaster:(catalog,input)=>mutate('/masters/'+enc(catalog),input,input.id?'PATCH':'POST'),toggleMaster:(catalog,id)=>mutate('/masters/'+enc(catalog)+'/'+enc(id)+'/toggle',{}),
    saveSettings:input=>mutate('/settings',input,'PATCH'),saveTenantUser:async input=>{const result=await mutate('/users'+(input.id?'/'+enc(input.id):''),input.id ? {role:input.role,active:input.active} : {name:input.name,email:input.email,password:input.password,role:input.role,active:input.active},input.id?'PATCH':'POST');await refreshIdentity();return result;},saveGuest:input=>mutate('/guests'+(input.id?'/'+enc(input.id):''),input,input.id?'PATCH':'POST'),
    addCharge:(id,input,intent)=>mutate('/reservations/'+enc(id)+'/charges',input,'POST',intent),addPayment:(id,input,intent)=>mutate('/reservations/'+enc(id)+'/payments',input,'POST',intent),refundPayment:(id,paymentId,input,intent)=>mutate('/reservations/'+enc(id)+'/payments/'+enc(paymentId)+'/refund',input,'POST',intent),addNote:(id,input)=>mutate('/reservations/'+enc(id)+'/notes',input),
    savePosInvoice:({id,...input})=>financial('/pos/invoices'+(id?'/'+enc(id):''),input,id?'PATCH':'POST'),
    getPosInvoices:filters=>requestTenant('/pos/invoices?'+new URLSearchParams(Object.entries(filters).filter(([,v])=>v!==''&&v!=null))),
    getPosInvoice:id=>requestTenant('/pos/invoices/'+enc(id)),
    postPosInvoice:(id,input={})=>financial('/pos/invoices/'+enc(id)+'/post',input),
    payPosInvoice:(id,input)=>financial('/pos/invoices/'+enc(id)+'/payments',input),
    refundPosInvoice:(id,paymentId,input)=>financial('/pos/invoices/'+enc(id)+'/payments/'+enc(paymentId)+'/refund',input),
    cancelPosInvoice:(id,input)=>financial('/pos/invoices/'+enc(id)+'/cancel',input),
    getCashbook:filters=>requestTenant('/cashbook?'+new URLSearchParams(Object.entries(filters).filter(([,v])=>v!==''&&v!=null))),
    createCashDocument:input=>financial('/cash-documents',input),reverseCashDocument:(id,input)=>financial('/cash-documents/'+enc(id)+'/reverse',input),
    adjustBooking:(id,input)=>financial('/reservations/'+enc(id)+'/adjustments',input),
    saveHousekeepingStaff:({id,...input})=>mutate('/housekeeping/staff'+(id?'/'+enc(id):''),input,id?'PATCH':'POST'),
    saveHousekeepingShift:({id,...input})=>mutate('/housekeeping/shifts'+(id?'/'+enc(id):''),input,id?'PATCH':'POST'),
    generateHousekeepingPlan:input=>mutate('/housekeeping/tasks',input),
    assignHousekeepingTask:(id,input)=>mutate('/housekeeping/tasks/'+enc(id)+'/assign',input),
    updateHousekeepingTask:(id,input)=>mutate('/housekeeping/tasks/'+enc(id)+'/status',input),
    quote:input=>requestTenant('/quote',{method:'POST',body:input}),getAvailability:(start,end,typeId='')=>requestTenant('/availability?'+new URLSearchParams({start,end,typeId})),
    saveRate:input=>mutate('/rates',input,'PUT'),addBlock:input=>mutate('/room-blocks',input),deleteBlock:id=>mutate('/room-blocks/'+enc(id),undefined,'DELETE'),
    saveInventoryMaster:(catalog,input)=>mutate('/inventory/masters/'+enc(catalog),input,input.id?'PATCH':'POST'),
    createInventoryDocument:(input,intent)=>financial('/inventory/documents',input,'POST',intent),
    reverseInventoryDocument:(id,input,intent)=>financial('/inventory/documents/'+enc(id)+'/reverse',input,'POST',intent),
    saveServiceStockLink:input=>mutate('/inventory/service-stock-links',input),
    returnPosStock:(id,input,intent)=>financial('/inventory/pos/'+enc(id)+'/returns',input,'POST',intent),
    savePricing:(catalog,input)=>mutate('/pricing/'+enc(catalog),input,input.id?'PATCH':'POST'),
    saveExchangeRate:input=>mutate('/pricing/exchange-rates',input,'PUT'),
    changePassword:input=>api.request('/api/auth/change-password',{method:'POST',body:input}),requestTenant,saveTenant,available,createReceipt:unavailable,setTenants:unavailable,setFeatures:unavailable,setTenantFeatureOverrides:unavailable,
    getDashboardReport,getRevenueReport,getFinancialReport,listPlans,savePlan,getTenantSubscription,saveTenantSubscription,getSubscriptionHistory,
    listSystemUsers,saveSystemUser,getManagerFeatures,setGlobalFeature,saveFeatureOverride,removeFeatureOverride,
    listSaasInvoices,createSaasInvoice,recordSaasPayment,voidSaasInvoice,getManagerOverview,
    getManagedTenantUsers,saveManagedTenantUser,getCustomerHistory,getOwnSessions,revokeOtherSessions,saveOwnProfile,
  };
  return <PmsContext.Provider value={value}>{children}</PmsContext.Provider>;
}
