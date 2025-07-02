// To parse this data:
//
//   import { Convert } from "./file";
//
//   const reservePost = Convert.toReservePost(json);

export interface ReservePost {
    reserveID: number;
    status:    number;
}

// Converts JSON strings to/from your types
export class Convert {
    public static toReservePost(json: string): ReservePost[] {
        return JSON.parse(json);
    }

    public static reservePostToJson(value: ReservePost[]): string {
        return JSON.stringify(value);
    }
}
