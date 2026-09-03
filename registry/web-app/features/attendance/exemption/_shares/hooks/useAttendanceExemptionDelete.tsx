export const useAttendanceExemptionDelete = () =>
  // onSuccessfullyDelete?: () => void
  {
    // const { displayConfirm, setLoading, displayClose } = useDialog()
    // const deleteAttendanceExemptionMutation = useDeleteAttendanceExemption()
    // const queryClient = useQueryClient()
    //
    // const openDeleteDialog = useCallback(
    //   (exemption: AttendanceExemption) => {
    //     displayConfirm({
    //       title: 'Xoá miễn chấm công',
    //       content: (
    //         <div className="text-content-dark-2">
    //           Bạn có chắc muốn xoá miễn chấm công cho{' '}
    //           <b className="typo-body-lg-regular text-content-dark-2">
    //             {exemption.employee.fullname} ({exemption.employee.code})
    //           </b>{' '}
    //           không?
    //           <br />
    //           Thao tác này không thể hoàn tác.
    //         </div>
    //       ),
    //       confirmText: 'Xoá',
    //       cancelText: 'Huỷ',
    //       confirmButtonClassName:
    //         'bg-action-primary-red-default hover:bg-action-primary-red-hover text-white',
    //       size: 'xl',
    //       onConfirm: async () => {
    //         try {
    //           setLoading(true)
    //           await deleteAttendanceExemptionMutation.mutateAsync(exemption.id)
    //           toastService.success('Xoá miễn chấm công thành công')
    //           await queryClient.invalidateQueries({
    //             queryKey: QUERY_KEYS.HRM.ATTENDANCE_EXEMPTIONS.ALL(),
    //           })
    //           displayClose()
    //           onSuccessfullyDelete?.()
    //         } catch (error) {
    //           console.error('Lỗi khi xoá miễn chấm công:', error)
    //           toastService.error('Có lỗi xảy ra khi xoá miễn chấm công')
    //         } finally {
    //           setLoading(false)
    //         }
    //       },
    //     })
    //   },
    //   [
    //     displayConfirm,
    //     deleteAttendanceExemptionMutation,
    //     onSuccessfullyDelete,
    //     setLoading,
    //     queryClient,
    //     displayClose,
    //   ]
    // )
    //
    // return {
    //   openDeleteDialog,
    //   isDeleting: deleteAttendanceExemptionMutation.isPending,
    // }
  }
