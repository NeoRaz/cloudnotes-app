<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\ServerAuthController;
use App\Http\Controllers\ForgotPassword\ForgotPasswordController;
use App\Http\Controllers\Registration\RegistrationContoller;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::post(
    '/login',
    [AuthController::class, 'token']
)->name('oauth.login');

Route::post(
    '/send-reset-password-email',
    [ForgotPasswordController::class, 'sendResetPasswordEmail']
)
    ->name('send-reset-password-email')
    ->middleware('throttle:5,1');

Route::post(
    '/check-password-token-validity',
    [ForgotPasswordController::class, 'checkTokenValidity']
)->name('check-password-token-validity');

Route::post(
    '/reset-password',
    [ForgotPasswordController::class, 'resetPassword']
)->name('reset-password');

Route::post(
    '/refresh-token',
    [AuthController::class, 'refreshToken']
)->name('oauth.refresh-token');

Route::post(
    '/token',
    [ServerAuthController::class, 'token']
)->name('oauth.token')->middleware('block.password.client');

Route::prefix('v1')->middleware(['throttle:60,1'])->group(function () {
    Route::prefix('register')->group(function () {

        //prefix: v1/register/account-setup
        Route::post(
            '/account-setup',
            [RegistrationContoller::class, 'accountSetup']
        )->name('registration.account-setup');

        //prefix: v1/register/verify-registration
        Route::post(
            '/verify-registration',
            [RegistrationContoller::class, 'verifyRegistration']
        )->name('registration.verify-registration');

        //prefix: v1/register/retrieve-registration
        Route::post(
            '/retrieve-registration',
            [RegistrationContoller::class, 'retrieveRegistration']
        )->name('registration.retrieve-registration');
    });
});


Route::middleware(['auth:api', 'throttle:60,1'])->group(function () {
    require base_path('routes/sub-routes/manage-user.php');
    require base_path('routes/sub-routes/manage-note.php');
    require base_path('routes/sub-routes/manage-utility.php');
    require base_path('routes/sub-routes/manage-assistant.php');
});
