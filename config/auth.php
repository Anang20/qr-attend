<?php

/*
| Hanya opsi yang berbeda dari bawaan Laravel.
*/

return [
    'passwords' => [
        'users' => [
            'provider' => 'users',
            'table' => 'password_reset_tokens',
            // BR-27: tautan atur ulang kata sandi berlaku 30 menit.
            'expire' => 30,
            'throttle' => 60,
        ],
    ],

    // Tautan verifikasi email berlaku 60 menit.
    'verification' => [
        'expire' => 60,
    ],
];
