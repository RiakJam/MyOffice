!ifndef INPUT_DIR
  !error "INPUT_DIR is required"
!endif
!ifndef OUTPUT_FILE
  !error "OUTPUT_FILE is required"
!endif
!ifndef ICON_FILE
  !error "ICON_FILE is required"
!endif
!ifndef DISPLAY_VERSION
  !define DISPLAY_VERSION "0.0.0"
!endif
Unicode true
Name "Myoffice"
OutFile "${OUTPUT_FILE}"
InstallDir "$LOCALAPPDATA\Programs\Myoffice"
RequestExecutionLevel user
SetCompressor zlib
ShowInstDetails show
ShowUninstDetails show
Icon "${ICON_FILE}"
UninstallIcon "${ICON_FILE}"
Page directory
Page instfiles
UninstPage uninstConfirm
UninstPage instfiles
Section "Install Myoffice"
  SetOutPath "$INSTDIR"
  File /r "${INPUT_DIR}/*"
  WriteUninstaller "$INSTDIR\Uninstall Myoffice.exe"
  CreateDirectory "$SMPROGRAMS\Myoffice"
  CreateShortcut "$SMPROGRAMS\Myoffice\Myoffice.lnk" "$INSTDIR\Myoffice.exe"
  CreateShortcut "$DESKTOP\Myoffice.lnk" "$INSTDIR\Myoffice.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Myoffice" "DisplayName" "Myoffice"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Myoffice" "DisplayVersion" "${DISPLAY_VERSION}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Myoffice" "Publisher" "Myoffice"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Myoffice" "UninstallString" '"$INSTDIR\Uninstall Myoffice.exe"'
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Myoffice" "DisplayIcon" "$INSTDIR\Myoffice.exe"
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Myoffice" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Myoffice" "NoRepair" 1
SectionEnd
Section "Uninstall"
  Delete "$DESKTOP\Myoffice.lnk"
  Delete "$SMPROGRAMS\Myoffice\Myoffice.lnk"
  RMDir "$SMPROGRAMS\Myoffice"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Myoffice"
  RMDir /r "$INSTDIR"
SectionEnd
