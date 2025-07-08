// To parse this data:
//
//   import { Convert, GeneralLocationPut } from "./file";
//
//   const generalLocationPut = Convert.toGeneralLocationPut(json);

export interface GeneralLocationPut {
    email: string;
    lat:   string;
    lng:   string;
}

// Converts JSON strings to/from your types
export class Convert {
    public static toGeneralLocationPut(json: string): GeneralLocationPut {
        return JSON.parse(json);
    }

    public static generalLocationPutToJson(value: GeneralLocationPut): string {
        return JSON.stringify(value);
    }
}
