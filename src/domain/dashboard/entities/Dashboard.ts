export type AdminDashboardData = {
  clinic: { name: string; city: string };
  kpis: {
    todayAppointments: number;
    todayScheduled: number;
    todayCompleted: number;
    todayNoShow: number;
    todayCancelled: number;
    attendanceRate: number;
    monthAppointments: number;
    monthAppointmentsDelta: string;
    newPatientsMonth: number;
    newPatientsDelta: string;
    totalPatients: number;
    totalDoctors: number;
    totalBoxes: number;
    revenue: number;
    revenueDelta: string;
  };
  topDoctors: Array<{ name: string; specialty: string; count: number }>;
  topTreatments: Array<{ name: string; count: number; price: number }>;
  appointmentsByStatus: Array<{ status: string; count: number }>;
  recentAppointments: Array<{
    id: string;
    startAt: string;
    endAt: string;
    status: string;
    paymentStatus: string;
    patientName: string;
    doctorName: string;
    boxName: string;
  }>;
};

export type DoctorDashboardData = {
  clinic: { name: string; city: string };
  doctorName: string;
  specialty: string;
  kpis: {
    todayAppointments: number;
    todayScheduled: number;
    todayCompleted: number;
    todayNoShow: number;
    todayCancelled: number;
    attendanceRate: number;
    monthAppointments: number;
    monthAppointmentsDelta: string;
    totalPatients: number;
    revenue: number;
    revenueDelta: string;
  };
  topTreatments: Array<{ name: string; count: number; price: number }>;
  appointmentsByStatus: Array<{ status: string; count: number }>;
  todaySchedule: Array<{
    id: string;
    startAt: string;
    endAt: string;
    status: string;
    paymentStatus: string;
    patientName: string;
    boxName: string;
  }>;
};

export type SecretaryDashboardData = {
  clinic: { name: string; city: string };
  kpis: {
    todayAppointments: number;
    todayScheduled: number;
    todayCompleted: number;
    todayNoShow: number;
    todayCancelled: number;
    attendanceRate: number;
    todayTreatmentCount: number;
  };
  appointmentsByStatus: Array<{ status: string; count: number }>;
  todayTreatments: Array<{
    id: string;
    treatmentName: string;
    patientName: string;
    performedAt: string;
  }>;
  recentAppointments: Array<{
    id: string;
    startAt: string;
    endAt: string;
    status: string;
    paymentStatus: string;
    patientName: string;
    doctorName: string;
    boxName: string;
  }>;
};
