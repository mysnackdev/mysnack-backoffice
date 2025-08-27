export type OrderResponse = {
  key: string;
  nome: string;
  status: string;
  createdAt?: number;
  cancelled?: boolean;
};