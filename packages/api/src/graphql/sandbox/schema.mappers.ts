

export interface BookMapper {
  title: string;
  page?(nr: number): PageMapper;
}

export interface PageMapper {
  content: string;
}