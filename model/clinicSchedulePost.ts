// To parse this data:
//
//   import { Convert } from "./file";
//
//   const clinicSchedulePost = Convert.toClinicSchedulePost(json);

export interface ClinicSchedulePost {
    clinic_email: string;
    weekdays:     string;
    open_time:    string;
    close_time:   string;
}

// Converts JSON strings to/from your types
export class Convert {
    public static toClinicSchedulePost(json: string): ClinicSchedulePost[] {
        return JSON.parse(json);
    }

    public static clinicSchedulePostToJson(value: ClinicSchedulePost[]): string {
        return JSON.stringify(value);
    }
}
