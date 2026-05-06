const parsedPlaceImageMaxCount = Number(process.env.NEXT_PUBLIC_PLACE_IMAGE_MAX_COUNT);

export const PLACE_IMAGE_MAX_COUNT = Number.isFinite(parsedPlaceImageMaxCount) && parsedPlaceImageMaxCount > 0
  ? parsedPlaceImageMaxCount
  : 5;
