variable "compartment_id" {
  description = "OCI Compartment OCID"
  type        = string
}

variable "region" {
  description = "OCI Region"
  type        = string
  default     = "ap-osaka-1"
}

variable "ssh_public_key" {
  description = "SSH public key for instance access"
  type        = string
}

variable "instance_name" {
  description = "Name of the compute instance"
  type        = string
  default     = "inkbot3"
}

variable "vcn_cidr_block" {
  description = "CIDR block for VCN"
  type        = string
  default     = "10.0.0.0/16"
}

variable "subnet_cidr_block" {
  description = "CIDR block for subnet"
  type        = string
  default     = "10.0.1.0/24"
}

variable "instance_shape" {
  description = "Compute instance shape"
  type        = string
  default     = "VM.Standard.A1.Flex"
}

variable "instance_ocpus" {
  description = "Number of OCPUs"
  type        = number
  default     = 1
}

variable "instance_memory_gb" {
  description = "Memory in GB"
  type        = number
  default     = 6
}

variable "image_os" {
  description = "OS name for the compute image"
  type        = string
  default     = "Canonical Ubuntu"
}

variable "image_os_version" {
  description = "OS version for the compute image"
  type        = string
  default     = "24.04 Minimal aarch64"
}

variable "budget_amount" {
  description = "Monthly budget amount in currency units"
  type        = number
  default     = 1
}

variable "budget_alert_email" {
  description = "Email address for budget alerts"
  type        = string
}
