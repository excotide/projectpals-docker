<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class JoinRoomRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'room_code' => ['required', 'string', 'max:10'],
            'primary_role' => ['nullable', 'string', 'max:100'],
            'backup_role' => ['nullable', 'string', 'max:255'],
            'backup_roles' => ['nullable', 'array'],
            'backup_roles.*' => ['string', 'max:100'],
            'productivity_windows' => ['nullable', 'array', 'min:1', 'max:2'],
            'productivity_windows.*' => ['in:morning,afternoon,evening,flexible'],
            'environments' => ['nullable', 'array', 'min:1', 'max:2'],
            'environments.*' => ['in:private,public,online,flexible'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $payload = [
            'room_code' => $this->input('room_code', $this->input('roomCode')),
            'primary_role' => $this->input('primary_role', $this->input('primaryRole')),
        ];

        // Ordered backup roles (new) — accept array or CSV string; sync legacy
        // single `backup_role` string for backward-compatible displays.
        $backupRoles = $this->input('backup_roles', $this->input('backupRoles'));
        if (is_string($backupRoles)) {
            $backupRoles = array_values(array_filter(array_map('trim', explode(',', $backupRoles))));
        }
        if (is_array($backupRoles)) {
            $backupRoles = array_values(array_filter($backupRoles, static fn ($r) => is_string($r) && trim($r) !== ''));
            $payload['backup_roles'] = $backupRoles;
            $payload['backup_role'] = implode(', ', $backupRoles);
        } else {
            // Fallback: only the legacy single backup_role was sent.
            $legacy = $this->input('backup_role', $this->input('backupRole'));
            if (is_string($legacy) && trim($legacy) !== '') {
                $payload['backup_role'] = $legacy;
                $payload['backup_roles'] = [trim($legacy)];
            }
        }

        $productivityWindows = $this->input('productivity_windows', $this->input('productivityWindows'));
        if (is_string($productivityWindows)) {
            $productivityWindows = array_values(array_filter(array_map('trim', explode(',', $productivityWindows))));
        }
        if (is_array($productivityWindows) && $productivityWindows !== []) {
            $payload['productivity_windows'] = $productivityWindows;
        }

        $environments = $this->input('environments');
        if (is_string($environments)) {
            $environments = array_values(array_filter(array_map('trim', explode(',', $environments))));
        }
        if (is_array($environments) && $environments !== []) {
            $payload['environments'] = $environments;
        }

        $this->merge($payload);
    }
}
