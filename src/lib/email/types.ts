// Shared types for email templates
export interface OrderLineItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_path?: string | null;
}
