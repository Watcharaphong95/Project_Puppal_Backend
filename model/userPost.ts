// To parse this data:
//
//   import { Convert } from "./file";
//
//   const userData = Convert.toUserData(json);

export interface UserData {
    email:    string;
    password: string;
    general:  number;
    clinic:   number;
}

// Converts JSON strings to/from your types
export class Convert {
    public static toUserData(json: string): UserData[] {
        return JSON.parse(json);
    }

    public static userDataToJson(value: UserData[]): string {
        return JSON.stringify(value);
    }
}
