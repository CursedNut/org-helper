'use strict';

/**
 * @module permit-remind-command
 * @author Alteh Union (alteh.union@gmail.com)
 * @license MIT (see the root LICENSE.md file for details)
 */

const DiscordCommand = require('../discord-command');
const CommandArgDef = require('../../command_meta/command-arg-def');

const DiscordChannelsArgScanner = require('../../arg_scanners/discord-channels-arg-scanner');
const DiscordSubjectsArgScanner = require('../../arg_scanners/discord-subjects-arg-scanner');

const PermissionsManager = require('../../managers/permissions-manager');

const PermitRemindCommandArgDefs = Object.freeze({
  subjectIds: new CommandArgDef('subjectIds', {
    aliasIds: ['command_permitremind_arg_subjectIds_alias_subjectIds', 'command_permitremind_arg_subjectIds_alias_s'],
    helpId: 'command_permitremind_arg_subjectIds_help',
    scanner: DiscordSubjectsArgScanner,
    validationOptions: { validSubjects: true }
  }),
  channelIds: new CommandArgDef('channelIds', {
    aliasIds: ['command_permitremind_arg_channelIds_alias_channelName', 'command_permitremind_arg_channelIds_alias_c'],
    helpId: 'command_permitremind_arg_channelIds_help',
    scanner: DiscordChannelsArgScanner,
    validationOptions: { validTextChannels: true, anyValueAllowed: true }
  })
});

/**
 * Command to add permission for specified users or roles to remind Dicord text channels.
 * @alias PermitRemindCommand
 * @extends DiscordCommand
 */
class PermitRemindCommand extends DiscordCommand {
  /**
   * Creates an instance for an organization from a source and assigns a given language manager to it.
   * @param  {Context}     context            the Bot's context
   * @param  {string}      source             the source name (like Discord etc.)
   * @param  {string}      orgId              the organization identifier
   * @param  {LangManager} commandLangManager the language manager
   * @return {Command}                        the created instance
   */
  static createForOrg(context, source, orgId, commandLangManager) {
    return new PermitRemindCommand(context, source, orgId, commandLangManager);
  }

  /**
   * Gets the text id of the command's name from localization resources.
   * @return {string} the id of the command's name to be localized
   */
  static getCommandInterfaceName() {
    return 'command_permitremind_name';
  }

  /**
   * Gets the array of all arguments definitions of the command.
   * @return {Array<CommandArgDef>} the array of definitions
   */
  static getDefinedArgs() {
    return PermitRemindCommandArgDefs;
  }

  /**
   * Gets the help text for the command (excluding the help text for particular arguments).
   * The lang manager is basically the manager from the HelpCommand's instance.
   * @see HelpCommand
   * @param  {Context}     context     the Bot's context
   * @param  {LangManager} langManager the language manager to localize the help text
   * @return {string}                  the localized help text
   */
  static getHelpText(context, langManager) {
    return langManager.getString('command_permitremind_help');
  }

  /**
   * Gets the array of defined Discord permission filters for the command.
   * Source-independent permissions (e.g. stored in the Bot's DB) should be defined in another place.
   * @return {Array<string>} the array of Discord-specific permissions required
   */
  static getRequiredDiscordPermissions() {
    return [PermissionsManager.DISCORD_PERMISSIONS.ADMINISTRATOR];
  }

  /**
   * Gets the default value for a given argument definition.
   * Used when unable to scan the argument from the command's text.
   * @param  {Message}        message the command's message
   * @param  {CommandArgDef}  arg     the argument definition
   * @return {Object}                 the default value
   */
  getDefaultDiscordArgValue(message, arg) {
    switch (arg) {
      case PermitRemindCommandArgDefs.channelIds:
        return this.langManager.getString(DiscordCommand.ANY_VALUE_TEXT);
      default:
        return null;
    }
  }

  /**
   * Executes the command instance. The main function of a command, it's essence.
   * All arguments scanning, validation and permissions check is considered done before entering this function.
   * So if any exception happens inside the function, it's considered a Bot's internal problem.
   * @param  {Message}         discordMessage the Discord message as the source of the command
   * @return {Promise<string>}                the result text to be replied as the response of the execution
   */
  async executeForDiscord(discordMessage) {
    // Inherited function with various possible implementations, some args may be unused.
    /* eslint no-unused-vars: ["error", { "args": "none" }] */
    let result = '';
    const dbResults = [];
    for (let i = 0; i < this.channelIds.channels.length; i++) {
      const filter = { channelId: this.channelIds.channels[i] };

      const subjectTypes = [];
      const subjects = [];
      for (let j = 0; j < this.subjectIds.subjectIds.length; j++) {
        subjectTypes.push(PermissionsManager.SUBJECT_TYPES.user.name);
        subjects.push(this.subjectIds.subjectIds[j]);
      }

      for (let j = 0; j < this.subjectIds.subjectRoles.length; j++) {
        subjectTypes.push(PermissionsManager.SUBJECT_TYPES.role.name);
        subjects.push(this.subjectIds.subjectRoles[j]);
      }

      for (const [j, element] of subjects.entries()) {
        const permissionRow = {
          source: this.source,
          orgId: this.orgId,
          subjectType: subjectTypes[j],
          subjectId: element,
          permissionType: PermissionsManager.DEFINED_PERMISSIONS.remind.name,
          filter
        };

        dbResults.push(
          this.context.dbManager.insertDiscordNext(this.context.dbManager.permissionsTable, this.orgId, permissionRow)
        );
      }
    }

    const rowResults = await Promise.all(dbResults);

    for (const rowResult of rowResults) {
      if (rowResult) {
        result = result + this.langManager.getString('command_permitremind_success') + '\n';
      } else {
        result = result + this.langManager.getString('command_permitremind_duplicate') + '\n';
      }
    }

    return result;
  }
}

/**
 * Exports the PermitRemindCommand class
 * @type {PermitRemindCommand}
 */
module.exports = PermitRemindCommand;