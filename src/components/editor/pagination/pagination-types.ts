export type CelionPaginationOptions = {
  enabled: boolean;
  pageWidthPx: number;
  pageHeightPx: number;
  pageGapPx: number;
  paddingTopPx: number;
  paddingRightPx: number;
  paddingBottomPx: number;
  paddingLeftPx: number;
  headerHeightPx: number;
  footerHeightPx: number;
  headerText: string;
  footerText: string;
  onEditHeader?: () => void;
  onEditFooter?: () => void;
  onPageCountChange?: (pageCount: number) => void;
};

export type MeasuredBlock = {
  pos: number;
  top: number;
  bottom: number;
};

export type PaginationMetrics = {
  bodyTop: number;
  bodyHeight: number;
  pageStep: number;
};

export type PaginationBreak = {
  key: string;
  pos: number;
  pageNumber: number;
  spacerHeight: number;
  headerTop: number;
  nextFooterTop: number;
};

export type PaginationState = {
  breaks: PaginationBreak[];
  pageCount: number;
};
