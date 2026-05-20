import Swal from 'sweetalert2';

export const showSuccess = (title, text) => {
  return Swal.fire({
    icon: 'success',
    title,
    text,
    timer: 2000,
    showConfirmButton: false
  });
};

export const showError = (title, text) => {
  return Swal.fire({
    icon: 'error',
    title,
    text,
    confirmButtonColor: '#10b981'
  });
};

export const showConfirm = async (title, text) => {
  const result = await Swal.fire({
    icon: 'warning',
    title,
    text,
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'Yes, proceed!'
  });
  return result.isConfirmed;
};
