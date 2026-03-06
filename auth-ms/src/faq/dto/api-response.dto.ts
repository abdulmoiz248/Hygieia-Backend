export class FaqResponseDto {
  id: string;
  question: string;
  answer: string;
  order_index?: number;
  created_at?: string;
  updated_at?: string;
}

export class FaqListResponseDto {
  data: FaqResponseDto[];
}
