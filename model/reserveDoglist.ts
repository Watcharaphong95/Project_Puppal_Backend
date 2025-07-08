// To parse this data:
//
//   import { Convert, ReserveDoglist } from "./file";
//
//   const reserveDoglist = Convert.toReserveDoglist(json);

export interface ReserveDoglist {
    email: string;
    date:  string;
}

// Converts JSON strings to/from your types
export class Convert {
    public static toReserveDoglist(json: string): ReserveDoglist {
        return JSON.parse(json);
    }

    public static reserveDoglistToJson(value: ReserveDoglist): string {
        return JSON.stringify(value);
    }
}
