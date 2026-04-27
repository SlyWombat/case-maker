; Case Maker NSIS installer hooks
;
; Adds support for the /PORT=N command-line argument so silent installs and
; unattended deployments can preconfigure the embedded HTTP server's port
; without a GUI prompt.
;
; Examples:
;     casemaker_setup.exe                  -> port defaults to 8000
;     casemaker_setup.exe /PORT=9000       -> port preset to 9000
;     casemaker_setup.exe /S /PORT=9000    -> silent install, port 9000
;
; The chosen port is written to %APPDATA%\casemaker\config.json before the
; first launch. The Rust HTTP server reads this file at startup.
;
; A full GUI port-prompt page is tracked separately — this hook covers the
; non-GUI install flow.

!include "FileFunc.nsh"

!macro NSIS_HOOK_POSTINSTALL
  ; Default
  StrCpy $0 "8000"

  ; Parse /PORT=N from the command line
  ${GetParameters} $R0
  ${GetOptions} $R0 "/PORT=" $R1
  ${If} ${Errors}
    ; No /PORT supplied — keep default
    ClearErrors
  ${Else}
    ; Validate range 1024..65535
    ${If} $R1 < 1024
      DetailPrint "Case Maker: invalid /PORT=$R1 (below 1024); falling back to 8000"
    ${ElseIf} $R1 > 65535
      DetailPrint "Case Maker: invalid /PORT=$R1 (above 65535); falling back to 8000"
    ${Else}
      StrCpy $0 $R1
    ${EndIf}
  ${EndIf}

  ; Ensure %APPDATA%\casemaker exists
  CreateDirectory "$APPDATA\casemaker"

  ; Write config.json
  FileOpen $1 "$APPDATA\casemaker\config.json" w
  FileWrite $1 "{$\r$\n"
  FileWrite $1 '  "port": $0,$\r$\n'
  FileWrite $1 '  "bind_to_all": false$\r$\n'
  FileWrite $1 "}$\r$\n"
  FileClose $1

  DetailPrint "Case Maker: configured port $0 in $APPDATA\casemaker\config.json"
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  ; Leave config.json in place — preserves user settings across reinstalls.
!macroend
