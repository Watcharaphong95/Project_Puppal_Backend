// To parse this data:
//
//   import { Convert, ClinicSearch } from "./file";
//
//   const clinicSearch = Convert.toClinicSearch(json);

export interface ClinicSearch {
    email: string;
    word:  string;
}

// Converts JSON strings to/from your types
export class Convert {
    public static toClinicSearch(json: string): ClinicSearch {
        return JSON.parse(json);
    }

    public static clinicSearchToJson(value: ClinicSearch): string {
        return JSON.stringify(value);
    }
}
