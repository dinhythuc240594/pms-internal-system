export function mappingCatalogState(catalog, mappings, draft) {
  const current = mappings.find(row => row.roomTypeId === draft?.roomTypeId);
  const others = mappings.filter(row => row.roomTypeId !== draft?.roomTypeId);
  const roomTypes = (catalog?.roomTypes || []).map(room => ({ ...room, available: !others.some(row => row.channexRoomTypeId === room.id) }));
  const ratePlans = (catalog?.ratePlans || []).filter(rate => rate.roomTypeId === draft?.channexRoomTypeId)
    .map(rate => ({ ...rate, available: rate.supported && !others.some(row => row.channexRatePlanId === rate.id) }));
  const unchanged = current && current.channexRoomTypeId === draft?.channexRoomTypeId && current.channexRatePlanId === draft?.channexRatePlanId;
  const validChoice = roomTypes.some(room => room.id === draft?.channexRoomTypeId && room.available)
    && ratePlans.some(rate => rate.id === draft?.channexRatePlanId && rate.available);
  return { roomTypes, ratePlans, canSave: Boolean(draft?.roomTypeId && !current?.pauseRequested && (unchanged || (!current?.targetLocked && validChoice))) };
}
